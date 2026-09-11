import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { secretApiRoutes } from './routes/secretApi.js';
import { secretPruner } from './db/pruner.js';
import { telegramBot } from './bot/bot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  const fastify = Fastify({
    logger: true
  });

  // 1. Cross-Origin Resource Sharing
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS']
  });

  // 2. Rate Limiting Protection
  await fastify.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait before creating or fetching more secrets.'
    })
  });

  // 3. API Routes
  await fastify.register(secretApiRoutes);

  // 4. Static Frontend Serving
  // Looks for web dist in dist/public or ../dist/public or ../../web/dist
  const possibleStaticDirs = [
    path.join(__dirname, 'public'),
    path.join(__dirname, '../dist/public'),
    path.join(__dirname, '../../web/dist')
  ];

  const staticDir = possibleStaticDirs.find((dir) => fs.existsSync(dir));

  if (staticDir) {
    fastify.log.info(`[Static] Serving web frontend assets from ${staticDir}`);
    await fastify.register(fastifyStatic, {
      root: staticDir,
      prefix: '/'
    });

    // SPA fallback: send index.html for unknown non-API routes
    fastify.setNotFoundHandler((request, reply) => {
      if (request.raw.url && request.raw.url.startsWith('/api')) {
        return reply.status(404).send({ error: 'API route not found' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    fastify.log.warn('[Static] Frontend build directory not found. Serving API only.');
    fastify.get('/', async () => ({
      service: 'PeerVault Drop API',
      status: 'online',
      hint: 'Run npm run build:web to build the frontend assets.'
    }));
  }

  // 5. Start Background Workers
  secretPruner.start();
  await telegramBot.start();

  // 6. Start HTTP Server
  try {
    await fastify.listen({ port: config.port, host: config.host });
    console.log(`\n=================================================`);
    console.log(`🔒 PeerVault Drop Server running at http://${config.host}:${config.port}`);
    console.log(`🛡️ Zero-Knowledge Ephemeral Secret Sharing Service`);
    console.log(`=================================================\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    secretPruner.stop();
    await telegramBot.stop();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('Fatal initialization error:', err);
  process.exit(1);
});
