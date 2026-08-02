import { MainKeyboards } from './mainKeyboards.js';
import { NEWS_CATEGORIES } from './config.js';
import { NewsService } from './services/newsService.js';

const greet = (name) => `Привет${name ? `, ${name}` : ''}! 👋`;

export const CommandHandlers = {
  async start(ctx) {
    const name = ctx.user?.first_name || ctx.user?.username;
    const text = `${greet(name)} Я *ИнфоПульс* 📰 — новостной агрегатор.

Отправьте любой текст — найду свежие новости.
Или выберите категорию ниже 👇`;

    return ctx.reply(text, {
      format: 'markdown',
      attachments: [MainKeyboards.getMainKeyboard()],
    });
  },

  async help(ctx) {
    return ctx.reply(
      `*ИнфоПульс — справка* ℹ️

*Команды:*
/start — главное меню
/help — эта справка
/tech · /sports · /politics · /business · /science — новости по категориям
/chat — режим чата с AI
/settings — настройки
/myid — ваш ID
/admin — админ-панель (если вы админ)

*Как искать:*
Просто напишите запрос обычным текстом — например:
• *искусственный интеллект*
• *новости спорта*
• *что нового в космосе*

*Настройка источников:*
В .env задайте NEWS_PROVIDER=gnews и NEWS_API_KEY=... — тогда бот тянет реальные новости. Без ключа работает демо-режим.`,
      { format: 'markdown', attachments: [MainKeyboards.getMainKeyboard()] },
    );
  },

  async chat(ctx) {
    return ctx.reply(
      `💬 *Режим чата*\n\nНапишите любой запрос — найду свежие новости по теме.`,
      { format: 'markdown', attachments: [MainKeyboards.getCategoryKeyboard()] },
    );
  },

  async settings(ctx) {
    return ctx.reply(
      `⚙️ *Настройки*\n\nУправляйте уведомлениями и темой.`,
      {
        format: 'markdown',
        attachments: [MainKeyboards.getSettingsKeyboard(true)],
      },
    );
  },

  async admin(ctx) {
    if (!ctx.config?.isAdmin?.(ctx.user?.user_id)) {
      return ctx.reply('⛔ Эта команда доступна только администраторам.');
    }
    return ctx.reply(`👑 *Админ-панель*`, {
      format: 'markdown',
      attachments: [MainKeyboards.getAdminKeyboard()],
    });
  },

  async config(ctx) {
    if (!ctx.config?.isAdmin?.(ctx.user?.user_id)) {
      return ctx.reply('⛔ Только для администраторов.');
    }
    const id = ctx.user?.user_id;
    return ctx.reply(
      `🛠 *Config*

Ваш ID: \`${id}\`
Добавьте его в \`max-bot/.env\` → \`ADMIN_IDS=\` и перезапустите бота, чтобы получить админ-доступ.`,
      { format: 'markdown' },
    );
  },
};
