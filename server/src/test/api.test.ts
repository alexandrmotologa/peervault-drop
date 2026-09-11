import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { secretApiRoutes } from '../routes/secretApi.js';

describe('Server API Integration Tests', () => {
  let app: FastifyInstance;

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

  it('POST /api/secret should store secret, return ID, expiration, and revocation_token', async () => {
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
    expect(body.revocation_token).toBeDefined();
    expect(body.revocation_token.length).toBeGreaterThan(16);
  });

  it('GET /api/secret/:id should retrieve and burn secret atomically', async () => {
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

    // First read succeeds
    const getRes1 = await app.inject({
      method: 'GET',
      url: `/api/secret/${id}`
    });

    expect(getRes1.statusCode).toBe(200);
    const getBody1 = JSON.parse(getRes1.payload);
    expect(getBody1.ciphertext).toBe('cipher-burn-test-12345');
    expect(getBody1.burned).toBe(true);

    // Second read to same ID returns HTTP 404 (burned)
    const getRes2 = await app.inject({
      method: 'GET',
      url: `/api/secret/${id}`
    });

    expect(getRes2.statusCode).toBe(404);

    // Status endpoint confirms it is burned
    const statusRes = await app.inject({
      method: 'GET',
      url: `/api/secret/${id}/status`
    });
    expect(statusRes.statusCode).toBe(200);
    const statusBody = JSON.parse(statusRes.payload);
    expect(statusBody.status).toBe('burned');
    expect(statusBody.burned_at).toBeDefined();
  });

  it('POST /api/secret/:id/revoke should allow sender to manually destroy secret', async () => {
    const postRes = await app.inject({
      method: 'POST',
      url: '/api/secret',
      payload: {
        ciphertext: 'will-be-revoked-by-sender',
        iv: 'iv-revoke-12345',
        burn_after_read: true,
        ttl_seconds: 3600
      }
    });

    const { id, revocation_token } = JSON.parse(postRes.payload);

    // Revocation with invalid token fails
    const badRevokeRes = await app.inject({
      method: 'POST',
      url: `/api/secret/${id}/revoke`,
      payload: { revocation_token: 'wrong-token-value-1234567890' }
    });
    expect(badRevokeRes.statusCode).toBe(403);

    // Revocation with correct token succeeds
    const goodRevokeRes = await app.inject({
      method: 'POST',
      url: `/api/secret/${id}/revoke`,
      payload: { revocation_token }
    });
    expect(goodRevokeRes.statusCode).toBe(200);
    expect(JSON.parse(goodRevokeRes.payload).status).toBe('burned');

    // Attempting to read revoked secret returns 404
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/secret/${id}`
    });
    expect(getRes.statusCode).toBe(404);
  });
});
