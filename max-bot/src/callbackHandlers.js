import { MainKeyboards } from './mainKeyboards.js';
import { NEWS_CATEGORIES } from './config.js';
import { NewsService } from './services/newsService.js';

const requireAdmin = (ctx) => ctx.config?.isAdmin?.(ctx.user?.user_id);

async function runCategory(ctx, key) {
  const cat = NEWS_CATEGORIES[key];
  if (!cat) {
    return ctx.reply('❌ Неизвестная категория.');
  }
  await ctx.reply(`🔎 Ищу новости: *${cat.label}*...`, { format: 'markdown' });
  try {
    const articles = await NewsService.searchNews(cat.query, 5);
    return ctx.reply(NewsService.formatNewsResponse(articles, cat.label), {
      format: 'markdown',
      attachments: [MainKeyboards.getCategoryKeyboard()],
    });
  } catch (e) {
    console.error('❌ category error:', e);
    return ctx.reply('❌ Не удалось получить новости. Попробуйте позже.');
  }
}

export const CallbackHandlers = {
  startChat: (ctx) =>
    ctx.reply('💬 *AI-чат*\n\nНапишите любой запрос — найду новости.', {
      format: 'markdown',
      attachments: [MainKeyboards.getCategoryKeyboard()],
    }),

  showInfo: (ctx) =>
    ctx.reply(
      'ℹ️ *ИнфоПульс* — новостной агрегатор.\nИсточник: gnews.io (или demo). Поддержка категорий и поиска.',
      { format: 'markdown', attachments: [MainKeyboards.getMainKeyboard()] },
    ),

  showSettings: (ctx) =>
    ctx.reply('⚙️ *Настройки*', {
      format: 'markdown',
      attachments: [MainKeyboards.getSettingsKeyboard(true)],
    }),

  showAdmin: (ctx) => {
    if (!requireAdmin(ctx)) {
      return ctx.reply('⛔ Только для администраторов.');
    }
    return ctx.reply('👑 *Админ-панель*', {
      format: 'markdown',
      attachments: [MainKeyboards.getAdminKeyboard()],
    });
  },

  backToMain: (ctx) =>
    ctx.reply('🏠 Главное меню', {
      attachments: [MainKeyboards.getMainKeyboard()],
    }),

  searchNews: (ctx) =>
    ctx.reply('🔍 Напишите ваш запрос обычным текстом.', {
      attachments: [MainKeyboards.getChatKeyboard()],
    }),

  showTrends: (ctx) => runCategory(ctx, 'tech'),

  showExamples: (ctx) =>
    ctx.reply(
      '*Примеры запросов:*\n• искусственный интеллект\n• космос\n• криптовалюта\n• спорт сегодня\n• климат',
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

  showStats: (ctx) =>
    ctx.reply(
      '📊 *Статистика* (демо)\nПользователей: 0\nЗапросов: 0',
      { format: 'markdown', attachments: [MainKeyboards.getSettingsKeyboard(true)] },
    ),

  adminStats: (ctx) => {
    if (!requireAdmin(ctx)) return ctx.reply('⛔ Только для админов.');
    return ctx.reply('📊 *Admin stats*\n\n(заглушка — добавьте метрики позже)', {
      format: 'markdown',
      attachments: [MainKeyboards.getAdminKeyboard()],
    });
  },

  adminBroadcast: (ctx) => {
    if (!requireAdmin(ctx)) return ctx.reply('⛔ Только для админов.');
    return ctx.reply('📢 *Рассылка* — отправьте текст следующим сообщением.', {
      format: 'markdown',
      attachments: [MainKeyboards.getAdminKeyboard()],
    });
  },

  adminManage: (ctx) => {
    if (!requireAdmin(ctx)) return ctx.reply('⛔ Только для админов.');
    return ctx.reply('⚙️ *Управление* — (заглушка)', {
      format: 'markdown',
      attachments: [MainKeyboards.getAdminKeyboard()],
    });
  },
};
