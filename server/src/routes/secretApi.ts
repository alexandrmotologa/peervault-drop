import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { secretStore } from '../db/store.js';
import { config } from '../config.js';

const CreateSecretSchema = z.object({
  ciphertext: z.string().min(1).max(config.maxSecretPayloadBytes * 2, 'Ciphertext exceeds size limit'),
  iv: z.string().min(8).max(64),
  burn_after_read: z.boolean().default(true),
  has_passphrase: z.boolean().optional().default(false),
  passphrase_salt: z.string().optional(),
  is_file: z.boolean().optional().default(false),
  ttl_seconds: z.number().int().min(60).max(604800).default(86400)
});

const IdParamSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, 'Invalid secret identifier format')
});

const RevokeSchema = z.object({
  revocation_token: z.string().min(16).max(64)
});

export const secretApiRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Health Check Endpoint
  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      service: 'PeerVault Drop',
      timestamp: Date.now(),
      uptime: Math.floor(process.uptime())
    };
  });

  // Create Encrypted Secret Endpoint
  fastify.post('/api/secret', async (request, reply) => {
    const parseResult = CreateSecretSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.format()
      });
    }

    const data = parseResult.data;
    const id = nanoid(16);

    const saved = secretStore.saveSecret({
      id,
      ciphertext: data.ciphertext,
      iv: data.iv,
      burn_after_read: data.burn_after_read,
      has_passphrase: data.has_passphrase,
      passphrase_salt: data.passphrase_salt,
      is_file: data.is_file,
      ttl_seconds: data.ttl_seconds
    });

    return reply.status(201).send({
      id: saved.id,
      expires_at: saved.expires_at,
      burn_after_read: data.burn_after_read,
      is_file: data.is_file,
      revocation_token: saved.revocation_token
    });
  });

  // Retrieve & Burn Secret Endpoint
  fastify.get('/api/secret/:id', async (request, reply) => {
    const paramResult = IdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({
        error: 'Invalid secret ID format'
      });
    }

    const { id } = paramResult.data;
    const record = secretStore.getAndBurnSecret(id);

    if (!record) {
      return reply.status(404).send({
        error: 'Secret not found, expired, or already burned'
      });
    }

    return reply.send({
      id: record.id,
      ciphertext: record.ciphertext,
      iv: record.iv,
      burn_after_read: Boolean(record.burn_after_read),
      has_passphrase: Boolean(record.has_passphrase),
      passphrase_salt: record.passphrase_salt || undefined,
      is_file: Boolean(record.is_file),
      burned: Boolean(record.burn_after_read)
    });
  });

  // Manually Revoke / Destroy Secret (Sender Only)
  fastify.post('/api/secret/:id/revoke', async (request, reply) => {
    const paramResult = IdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({ error: 'Invalid secret ID format' });
    }

    const bodyResult = RevokeSchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({ error: 'Revocation token required' });
    }

    const { id } = paramResult.data;
    const { revocation_token } = bodyResult.data;

    const revoked = secretStore.revokeSecret(id, revocation_token);

    if (!revoked) {
      return reply.status(403).send({
        error: 'Could not revoke secret. Token mismatch or secret already destroyed/expired.'
      });
    }

    return reply.send({
      success: true,
      id,
      status: 'burned',
      message: 'Secret destroyed permanently from server.'
    });
  });

  // Anonymous Status & Read Receipt Endpoint
  fastify.get('/api/secret/:id/status', async (request, reply) => {
    const paramResult = IdParamSchema.safeParse(request.params);
    if (!paramResult.success) {
      return reply.status(400).send({ error: 'Invalid secret ID format' });
    }

    const { id } = paramResult.data;
    const status = secretStore.getSecretStatus(id);

    return reply.send(status);
  });
};
