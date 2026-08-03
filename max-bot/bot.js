import { Bot } from '@maxhub/max-bot-api';
import { BOT_CONFIG, RSS_SOURCES, GIGACHAT_CONFIG } from './src/config.js';
import { CommandHandlers } from './src/commandHandlers.js';
import { CallbackHandlers } from './src/callbackHandlers.js';
import { adminMiddleware } from './src/adminMiddleware.js';
import { MainKeyboards } from './src/mainKeyboards.js';
import { newsService } from './src/services/newsService.js';

console.log('🔧 Инициализация InfiNews MAX Bot...');

if (!BOT_CONFIG.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing. Set it in max-bot/.env');
  process.exit(1);
}

const bot = new Bot(BOT_CONFIG.BOT_TOKEN);

bot.use(adminMiddleware);

bot.use(async (ctx, next) => {
  if (process.env.LOG_EVENTS === '1') {
    console.log('📨 Event:', {
      type: ctx.update?.type,
      userId: ctx.user?.user_id,
      text: ctx.message?.body?.text,
    });
  }
  return next();
});

const commands = [
  { name: 'start', description: 'Запустить бота' },
  { name: 'help', description: 'Помощь и справка' },
  { name: 'chat', description: 'Чат с AI-помощником' },
  { name: 'tech', description: 'Новости технологий' },
  { name: 'sports', description: 'Спортивные новости' },
  { name: 'politics', description: 'Политические новости' },
  { name: 'business', description: 'Бизнес-новости' },
  { name: 'science', description: 'Научные новости' },
  { name: 'world', description: 'Мировые новости' },
  { name: 'digest', description: 'Дайджест по всем категориям' },
  { name: 'sources', description: 'Список RSS-источников' },
  { name: 'ask', description: 'Спросить AI про статью (/ask <id> <вопрос>)' },
  { name: 'settings', description: 'Настройки' },
  { name: 'myid', description: 'Показать мой ID' },
  { name: 'admin', description: 'Админ-панель' },
];
bot.api.setMyCommands(commands)
  .then(() => console.log('✅ Команды бота установлены'))
  .catch((e) => console.error('❌ Ошибка установки команд:', e));

// ---------- Commands ----------
bot.command('start', (ctx) => CommandHandlers.start(ctx));
bot.command('help', (ctx) => CommandHandlers.help(ctx));
bot.command('chat', (ctx) => CommandHandlers.chat(ctx));
bot.command('settings', (ctx) => CommandHandlers.settings(ctx));
bot.command('admin', (ctx) => CommandHandlers.admin(ctx));
bot.command('config', (ctx) => CommandHandlers.config(ctx));
bot.command('digest', (ctx) => CommandHandlers.digest(ctx));
bot.command('sources', (ctx) => CommandHandlers.sources(ctx));
bot.command('reset_dedup', (ctx) => CommandHandlers.resetDedup(ctx));
bot.command('ask', (ctx) => CommandHandlers.ask(ctx));

bot.command('myid', (ctx) => {
  return ctx.reply(
    `*👤 Ваши идентификаторы:*\n\n*User ID:* \`${ctx.user?.user_id}\`\n*Chat ID:* \`${ctx.chat?.chat_id}\`\n*Username:* ${ctx.user?.username || 'не установлен'}`,
    { format: 'markdown' },
  );
});

// Categories as /commands
for (const key of Object.keys(RSS_SOURCES)) {
  bot.command(key, async (ctx) => {
    const cat = RSS_SOURCES[key];
    if (!cat) return;
    await ctx.reply(`🔎 Ищу новости: *${cat.label}*...`, { format: 'markdown' });
    try {
      const { articles } = await newsService.search(key, { limit: 7 });
      return ctx.reply(newsService.formatResponse(articles, `*${cat.label}*`), {
        format: 'markdown',
        attachments: [MainKeyboards.getCategoryKeyboard()],
      });
    } catch (e) {
      console.error('❌ category error:', e);
      return ctx.reply('❌ Не удалось получить новости. Попробуй позже.');
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

// Category callbacks
for (const key of Object.keys(RSS_SOURCES)) {
  bot.action(`cat_${key}`, async (ctx) => {
    const cat = RSS_SOURCES[key];
    await ctx.reply(`🔎 Ищу новости: *${cat.label}*...`, { format: 'markdown' });
    try {
      const { articles } = await newsService.search(key, { limit: 7 });
      return ctx.reply(newsService.formatResponse(articles, `*${cat.label}*`), {
        format: 'markdown',
        attachments: [MainKeyboards.getCategoryKeyboard()],
      });
    } catch (e) {
      console.error('❌ category cb error:', e);
      return ctx.reply('❌ Не удалось получить новости.');
    }
  });
}

// ---------- Text messages (free-form search) ----------
bot.on('message_created', async (ctx) => {
  const message = ctx.message;
  const text = message?.body?.text;
  if (!text || text.startsWith('/')) return;

  const userMessage = text.trim();
  await ctx.reply(`🔍 Ищу новости по запросу: «${userMessage}»...`);

  try {
    const { articles } = await newsService.search(userMessage, { limit: 7 });
    if (articles.length) {
      return ctx.reply(newsService.formatResponse(articles, `*🔍 ${userMessage}*`), {
        format: 'markdown',
        attachments: [MainKeyboards.getChatKeyboard()],
      });
    }
    return ctx.reply(
      `❌ По запросу «${userMessage}» ничего нового не нашлось.\n\nПопробуй другие ключевые слова.`,
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
console.log('🚀 Запуск InfiNews MAX Bot...');
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
