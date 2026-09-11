import { Bot, InlineKeyboard } from 'grammy';
import { config } from '../config.js';
import { setupInlineQueries } from './inline.js';

export class TelegramBotManager {
  private bot: Bot | null = null;
  private isRunning: boolean = false;

  constructor() {
    if (config.telegramBotToken && !config.telegramBotToken.startsWith('mock_')) {
      this.bot = new Bot(config.telegramBotToken);
      this.setupHandlers();
    }
  }

  private setupHandlers() {
    if (!this.bot) return;

    const appUrl = config.publicAppUrl;

    // /start command
    this.bot.command('start', async (ctx) => {
      const keyboard = new InlineKeyboard()
        .webApp('🔒 Create Encrypted Secret', appUrl)
        .row()
        .url('🌐 Open Web Version', appUrl);

      const welcomeText = 
        `🛡️ *Welcome to PeerVault Drop*\n\n` +
        `Zero-knowledge ephemeral secret sharing directly inside Telegram.\n\n` +
        `• *Client-Side Encryption:* Plaintext is encrypted in your browser using AES-GCM-256.\n` +
        `• *Zero-Knowledge Guarantee:* Decryption keys are stored only in the URL hash fragment (#key=...) and never reach our server.\n` +
        `• *Self-Destruct:* Secrets can be set to burn immediately after first read.\n\n` +
        `Tap the button below to launch the Mini App:`;

      await ctx.reply(welcomeText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    });

    // /help command
    this.bot.command('help', async (ctx) => {
      const helpText =
        `📖 *How PeerVault Drop Works*\n\n` +
        `1. You type your password or private key in the app.\n` +
        `2. Your browser generates a 256-bit AES key and encrypts the secret locally.\n` +
        `3. Only ciphertext and expiration metadata are saved to the server.\n` +
        `4. The link contains the decryption key after \`#key=...\`.\n` +
        `5. When the recipient opens the link, their browser fetches the ciphertext and decrypts it locally.\n` +
        `6. If burn-after-reading is active, the ciphertext is deleted from our database on first read.`;

      await ctx.reply(helpText, { parse_mode: 'Markdown' });
    });

    // /stats command
    this.bot.command('stats', async (ctx) => {
      const uptimeMin = Math.floor(process.uptime() / 60);
      await ctx.reply(`⚡ *PeerVault Drop Status*\n\n• Service: Operational\n• Uptime: ${uptimeMin} minutes\n• Mode: Zero-Knowledge E2EE`, {
        parse_mode: 'Markdown'
      });
    });

    // Setup inline queries
    setupInlineQueries(this.bot);
  }

  public async start() {
    if (!this.bot) {
      console.log('[Bot] No valid TELEGRAM_BOT_TOKEN provided. Running in standalone Web/API mode.');
      return;
    }

    try {
      this.isRunning = true;
      console.log('[Bot] Connecting to Telegram Bot API (Long Polling)...');
      this.bot.start({
        onStart: (botInfo) => {
          console.log(`[Bot] Successfully started long polling as @${botInfo.username}`);
        }
      }).catch((err) => {
        console.warn(`[Bot] Could not connect to Telegram API (${err.message}). Web server remains active.`);
        this.isRunning = false;
      });
    } catch (err: any) {
      console.warn(`[Bot] Initialization skipped: ${err.message}`);
    }
  }

  public async stop() {
    if (this.bot && this.isRunning) {
      await this.bot.stop();
      this.isRunning = false;
      console.log('[Bot] Telegram bot polling stopped.');
    }
  }
}

export const telegramBot = new TelegramBotManager();
