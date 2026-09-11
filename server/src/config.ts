import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '8080', 10),
  host: process.env.HOST || '0.0.0.0',
  dataDir: process.env.DATA_DIR || path.resolve(process.cwd(), 'data'),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
  botUsername: process.env.BOT_USERNAME || 'peervault_drop_bot',
  miniAppShortName: process.env.MINI_APP_SHORT_NAME || 'app',
  publicAppUrl: process.env.PUBLIC_APP_URL || 'http://localhost:8080',
  maxSecretPayloadBytes: parseInt(process.env.MAX_SECRET_PAYLOAD_BYTES || '65536', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  isDev: process.env.NODE_ENV !== 'production'
};
