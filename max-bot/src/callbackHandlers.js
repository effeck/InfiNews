import { MainKeyboards } from './mainKeyboards.js';
import { RSS_SOURCES, GIGACHAT_CONFIG } from './config.js';
import { newsService } from './services/newsService.js';

const requireAdmin = (ctx) => ctx.config?.isAdmin?.(ctx.user?.user_id);

export const CallbackHandlers = {
  startChat: (ctx) =>
    ctx.reply('*💬 AI-чат*\\n\\nНапиши любой запрос — найду новости.', {
      format: 'markdown',
      attachments: [MainKeyboards.getCategoryKeyboard()],
    }),

  showInfo: (ctx) =>
    ctx.reply(
      '*📰 InfiNews* — новостной MAX-бот с GigaChat AI.\\nИсточники: Lenta, Habr, TASS, RBC, Sports.ru и др.',
      { format: 'markdown', attachments: [MainKeyboards.getMainKeyboard()] },
    ),

  showSettings: (ctx) =>
    ctx.reply('*⚙️ Настройки*', {
      format: 'markdown',
      attachments: [MainKeyboards.getSettingsKeyboard(true)],
    }),

  showAdmin: (ctx) => {
    if (!requireAdmin(ctx)) return ctx.reply('⛔ Только для админов.');
    return ctx.reply('*👑 Админ-панель*', {
      format: 'markdown',
      attachments: [MainKeyboards.getAdminKeyboard()],
    });
  },

  backToMain: (ctx) =>
    ctx.reply('🏠 Главное меню', { attachments: [MainKeyboards.getMainKeyboard()] }),

  searchNews: (ctx) =>
    ctx.reply('🔍 Напиши запрос обычным текстом.', {
      attachments: [MainKeyboards.getChatKeyboard()],
    }),

  showTrends: async (ctx) => {
    const { articles } = await newsService.search('tech', { limit: 5 });
    return ctx.reply(newsService.formatResponse(articles, '*📈 Тренды: технологии*'), {
      format: 'markdown',
      attachments: [MainKeyboards.getCategoryKeyboard()],
    });
  },

  showExamples: (ctx) =>
    ctx.reply(
      '*Примеры запросов:*\\n• искусственный интеллект\\n• космос\\n• криптовалюта\\n• спорт сегодня\\n• климат',
      { format: 'markdown', attachments: [MainKeyboards.getChatKeyboard()] },
    ),

  toggleNotifications: (ctx) =>
    ctx.reply('🔔 Уведомления: Вкл (заглушка)', {
      attachments: [MainKeyboards.getSettingsKeyboard(false)],
    }),

  changeTheme: (ctx) =>
    ctx.reply('🎨 Тема: светлая (заглушка)', {
      attachments: [MainKeyboards.getSettingsKeyboard(true)],
    }),

  showStats: (ctx) => {
    const s = newsService.dedupStats();
    return ctx.reply(
      `*📊 Статистика InfiNews*\\nПоказано ранее: ${s.seen} новостей\\nGigaChat: ${GIGACHAT_CONFIG.ENABLED ? 'вкл' : 'выкл'}`,
      { format: 'markdown', attachments: [MainKeyboards.getSettingsKeyboard(true)] },
    );
  },

  adminStats: (ctx) => {
    if (!requireAdmin(ctx)) return ctx.reply('⛔ Только для админов.');
    const s = newsService.dedupStats();
    return ctx.reply(`*Admin stats*\\nКэш дедупа: ${s.seen} новостей`, {
      format: 'markdown',
      attachments: [MainKeyboards.getAdminKeyboard()],
    });
  },

  adminBroadcast: (ctx) => {
    if (!requireAdmin(ctx)) return ctx.reply('⛔ Только для админов.');
    return ctx.reply('*📢 Рассылка* — отправьте текст следующим сообщением.', {
      format: 'markdown',
      attachments: [MainKeyboards.getAdminKeyboard()],
    });
  },

  adminManage: (ctx) => {
    if (!requireAdmin(ctx)) return ctx.reply('⛔ Только для админов.');
    return ctx.reply('*⚙️ Управление* — (заглушка)', {
      format: 'markdown',
      attachments: [MainKeyboards.getAdminKeyboard()],
    });
  },
};
