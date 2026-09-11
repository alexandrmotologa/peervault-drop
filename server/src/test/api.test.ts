import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { secretApiRoutes } from '../routes/secretApi.js';
import { SecretStore } from '../db/store.js';

describe('Server API Integration Tests', () => {
  let app: FastifyInstance;
  let inMemoryStore: SecretStore;

  beforeEach(async () => {
    app = Fastify();
    await app.register(cors);
    await app.register(secretApiRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health should return ok status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health'
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('PeerVault Drop');
    expect(body.uptime).toBeDefined();
  });

  it('POST /api/secret should store secret and return ID with expiration', async () => {
    const payload = {
      ciphertext: 'U2FsdGVkX19v832...fakeCiphertext',
      iv: 'dGVzdEl2VmFsdWU',
      burn_after_read: true,
      ttl_seconds: 300
    };

    const res = await app.inject({
      method: 'POST',
      url: '/api/secret',
      payload
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe('string');
    expect(body.expires_at).toBeGreaterThan(Date.now());
  });

  it('GET /api/secret/:id should retrieve and burn secret atomically', async () => {
    // 1. Create a burn-after-read secret
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/secret',
      payload: {
        ciphertext: 'cipher-burn-test-12345',
        iv: 'iv-test-12345',
        burn_after_read: true,
        ttl_seconds: 3600
      }
    });

    const { id } = JSON.parse(postRes.payload);

    // 2. First read succeeds and returns ciphertext
    const getRes1 = await app.inject({
      method: 'GET',
      url: `/api/secret/${id}`
    });

    expect(getRes1.statusCode).toBe(200);
    const getBody1 = JSON.parse(getRes1.payload);
    expect(getBody1.ciphertext).toBe('cipher-burn-test-12345');
    expect(getBody1.iv).toBe('iv-test-12345');
    expect(getBody1.burned).toBe(true);

    // 3. Second read to same ID returns HTTP 404 (burned)
    const getRes2 = await app.inject({
      method: 'GET',
      url: `/api/secret/${id}`
    });

    expect(getRes2.statusCode).toBe(404);
    const getBody2 = JSON.parse(getRes2.payload);
    expect(getBody2.error).toContain('not found, expired, or already burned');
  });

  it('GET /api/secret/:id should allow multiple reads if burn_after_read is false', async () => {
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/secret',
      payload: {
        ciphertext: 'persistent-secret-999',
        iv: 'persistent-iv-999',
        burn_after_read: false,
        ttl_seconds: 3600
      }
    });

    const { id } = JSON.parse(postRes.payload);

    // First read
    const getRes1 = await app.inject({
      method: 'GET',
      url: `/api/secret/${id}`
    });
    expect(getRes1.statusCode).toBe(200);

    // Second read still succeeds
    const getRes2 = await app.inject({
      method: 'GET',
      url: `/api/secret/${id}`
    });
    expect(getRes2.statusCode).toBe(200);
  });

  it('POST /api/secret should reject invalid payloads', async () => {
    // Missing required fields
    const res = await app.inject({
      method: 'POST',
      url: '/api/secret',
      payload: {}
    });

    expect(res.statusCode).toBe(400);
  });
});
