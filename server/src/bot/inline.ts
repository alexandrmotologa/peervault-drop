import { Bot, InlineKeyboard } from 'grammy';
import { config } from '../config.js';

export function setupInlineQueries(bot: Bot) {
  bot.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim();
    const appUrl = `${config.publicAppUrl}`;

    const keyboard = new InlineKeyboard()
      .webApp('🔒 Create Zero-Knowledge Secret', appUrl);

    await ctx.answerInlineQuery([
      {
        type: 'article',
        id: 'create_secret',
        title: '🔒 Send Self-Destructing Secret',
        description: query ? `Ready to encrypt secret: "${query.slice(0, 30)}..."` : 'Tap to open PeerVault Drop Mini App and encrypt',
        thumbnail_url: `${config.publicAppUrl}/logo.svg`,
        input_message_content: {
          message_text: `🛡️ **PeerVault Drop — Secure Ephemeral Secret**\n\nPlaintext is encrypted locally with AES-GCM-256 before sending. The server never sees the unencrypted message.\n\n👇 Click below to open and manage secrets:`,
          parse_mode: 'Markdown'
        },
        reply_markup: keyboard
      }
    ], {
      cache_time: 10
    });
  });
}
