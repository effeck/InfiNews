import { Bot } from '@maxhub/max-bot-api';
import { BOT_CONFIG, NEWS_CATEGORIES } from './src/config.js';
import { CommandHandlers } from './src/commandHandlers.js';
import { CallbackHandlers } from './src/callbackHandlers.js';
import { adminMiddleware } from './src/adminMiddleware.js';
import { MainKeyboards } from './src/mainKeyboards.js';
import { NewsService } from './src/services/newsService.js';

console.log('🔧 Инициализация InfoPulse MAX Bot...');

if (!BOT_CONFIG.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing. Set it in max-bot/.env');
  process.exit(1);
}

const bot = new Bot(BOT_CONFIG.BOT_TOKEN);

bot.use(adminMiddleware);

bot.use(async (ctx, next) => {
  console.log('📨 Event:', {
    type: ctx.update?.type,
    userId: ctx.user?.user_id,
    text: ctx.message?.body?.text,
  });
  return next();
});

bot.api.setMyCommands([
  { name: 'start', description: 'Запустить бота' },
  { name: 'help', description: 'Помощь и справка' },
  { name: 'chat', description: 'Чат с AI-помощником' },
  { name: 'tech', description: 'Новости технологий' },
  { name: 'sports', description: 'Спортивные новости' },
  { name: 'politics', description: 'Политические новости' },
  { name: 'business', description: 'Бизнес-новости' },
  { name: 'science', description: 'Научные новости' },
  { name: 'myid', description: 'Показать мой ID' },
  { name: 'settings', description: 'Настройки бота' },
  { name: 'admin', description: 'Админ-панель' },
]).then(() => console.log('✅ Команды бота установлены'))
  .catch((e) => console.error('❌ Ошибка установки команд:', e));

// ---------- Commands ----------
bot.command('start', (ctx) => CommandHandlers.start(ctx));
bot.command('help', (ctx) => CommandHandlers.help(ctx));
bot.command('chat', (ctx) => CommandHandlers.chat(ctx));
bot.command('settings', (ctx) => CommandHandlers.settings(ctx));
bot.command('admin', (ctx) => CommandHandlers.admin(ctx));
bot.command('config', (ctx) => CommandHandlers.config(ctx));

bot.command('myid', (ctx) => {
  const userId = ctx.user?.user_id;
  const chatId = ctx.chat?.chat_id;
  return ctx.reply(
    `👤 *Ваши идентификаторы:*\n\n*User ID:* \`${userId}\`\n*Chat ID:* \`${chatId}\`\n*Username:* ${ctx.user?.username || 'не установлен'}`,
    { format: 'markdown' },
  );
});

// Категории быстрого поиска
for (const key of Object.keys(NEWS_CATEGORIES)) {
  bot.command(key, async (ctx) => {
    const cat = NEWS_CATEGORIES[key];
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
  });
}

// ---------- Callback actions ----------
const callbackActions = {
  start_chat: CallbackHandlers.startChat,
  show_info: CallbackHandlers.showInfo,
  show_settings: CallbackHandlers.showSettings,
  show_admin: CallbackHandlers.showAdmin,
  back_to_main: CallbackHandlers.backToMain,
  search_news: CallbackHandlers.searchNews,
  show_trends: CallbackHandlers.showTrends,
  show_examples: CallbackHandlers.showExamples,
  toggle_notifications: CallbackHandlers.toggleNotifications,
  change_theme: CallbackHandlers.changeTheme,
  show_stats: CallbackHandlers.showStats,
  admin_stats: CallbackHandlers.adminStats,
  admin_broadcast: CallbackHandlers.adminBroadcast,
  admin_manage: CallbackHandlers.adminManage,
};

for (const [action, handler] of Object.entries(callbackActions)) {
  bot.action(action, (ctx) => handler(ctx));
}

// Категории как callback
for (const key of Object.keys(NEWS_CATEGORIES)) {
  bot.action(`cat_${key}`, async (ctx) => {
    const cat = NEWS_CATEGORIES[key];
    await ctx.reply(`🔎 Ищу новости: *${cat.label}*...`, { format: 'markdown' });
    try {
      const articles = await NewsService.searchNews(cat.query, 5);
      return ctx.reply(NewsService.formatNewsResponse(articles, cat.label), {
        format: 'markdown',
        attachments: [MainKeyboards.getCategoryKeyboard()],
      });
    } catch (e) {
      console.error('❌ category callback error:', e);
      return ctx.reply('❌ Не удалось получить новости. Попробуйте позже.');
    }
  });
}

// ---------- Text messages ----------
bot.on('message_created', async (ctx) => {
  const message = ctx.message;
  const text = message?.body?.text;
  if (!text || text.startsWith('/')) return;

  const userMessage = text.trim();
  await ctx.reply(`🔍 Ищу новости по запросу: «${userMessage}»...`);

  try {
    const articles = await NewsService.searchNews(userMessage, 5);
    if (articles && articles.length) {
      return ctx.reply(NewsService.formatNewsResponse(articles, userMessage), {
        format: 'markdown',
        attachments: [MainKeyboards.getChatKeyboard()],
      });
    }
    return ctx.reply(
      `❌ По запросу «${userMessage}» новостей не нашлось.\n\nПопробуйте другие ключевые слова.`,
      { attachments: [MainKeyboards.getChatKeyboard()] },
    );
  } catch (e) {
    console.error('❌ search error:', e);
    return ctx.reply(`❌ Ошибка при поиске: ${e.message}`);
  }
});

bot.on('bot_started', (ctx) => CommandHandlers.start(ctx));

bot.catch((err) => console.error('❌ Bot error:', err));

// ---------- Start ----------
console.log('🚀 Запуск InfoPulse MAX Bot...');
bot.start()
  .then(() => console.log('✅ Бот подключен к серверам MAX!'))
  .catch((err) => {
    console.error('❌ Не удалось запустить бота:', err);
    process.exit(1);
  });

const shutdown = (sig) => {
  console.log(`\n🛑 ${sig} — останавливаю бота...`);
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
