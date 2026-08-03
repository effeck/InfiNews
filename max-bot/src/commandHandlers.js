import { MainKeyboards } from './mainKeyboards.js';
import { RSS_SOURCES, GIGACHAT_CONFIG, DEDUP_CONFIG } from './config.js';
import { newsService } from './services/newsService.js';

const greet = (name) => `Привет${name ? `, ${name}` : ''}! 👋`;

export const CommandHandlers = {
  async start(ctx) {
    const name = ctx.user?.first_name || ctx.user?.username;
    const aiBadge = GIGACHAT_CONFIG.ENABLED ? '\n\\u{1F9E0} AI-режим: включён (GigaChat)' : '';
    const text = `${greet(name)} Я *InfiNews* 📰 — новостной MAX-бот с GigaChat AI.\n\n` +
      `📡 Отправь любой текст — найду свежие новости по RSS-лентам.\n` +
      `📂 Или выбери категорию ниже 👇\n` +
      `\\u{1F9E0} Нажми «AI-саммари» — GigaChat сделает краткое резюме.\n` +
      `🔍 Используй /ask <id> <вопрос>, чтобы спросить AI про конкретную статью.${aiBadge}`;

    return ctx.reply(text, {
      format: 'markdown',
      attachments: [MainKeyboards.getMainKeyboard()],
    });
  },

  async help(ctx) {
    return ctx.reply(
      `*InfiNews — справка* ℹ️\\n\\n` +
      `*Команды:*\\n` +
      `/start — главное меню\\n` +
      `/help — эта справка\\n` +
      `/chat — режим чата\\n` +
      `/tech · /sports · /politics · /business · /science · /world — новости по категориям\\n` +
      `/digest — дайджест по всем категориям\\n` +
      `/sources — список RSS-источников\\n` +
      `/reset_dedup — сбросить кэш «уже показанных» (для админов)\\n` +
      `/settings — настройки\\n` +
      `/myid — ваш ID\\n` +
      `/admin — админ-панель\\n\\n` +
      `*Поиск:*\\n` +
      `Просто напиши запрос обычным текстом.\\n\\n` +
      `*GigaChat:*\\n` +
      `Если в .env задан GIGACHAT_ENABLED=1 + креды, бот:\\n` +
      `• предлагает кнопку «AI-саммари» под каждой выдачей;\\n` +
      `• понимает команду /ask <id> <вопрос> (id видно под новостями).\\n\\n` +
      `*Команда /ask:*\\n` +
      `После выдачи под каждой новостью есть короткий id (например, a4f3b2c1). Скопируй его и напиши:\\n` +
      `\\`/ask a4f3b2c1 что значит это решение?\\`\\n\\n` +
      `*Дубликаты:*\\n` +
      `Бот запоминает новости, которые уже показывал (по URL и заголовку), и не выводит их повторно в течение ${DEDUP_CONFIG.TTL_DAYS} дней. Сброс — /reset_dedup.`,
      { format: 'markdown', attachments: [MainKeyboards.getMainKeyboard()] },
    );
  },

  async chat(ctx) {
    return ctx.reply(
      `*💬 Режим чата*\\n\\nНапиши любой запрос — найду свежие новости.`,
      { format: 'markdown', attachments: [MainKeyboards.getCategoryKeyboard()] },
    );
  },

  async settings(ctx) {
    const stats = newsService.dedupStats();
    return ctx.reply(
      `*⚙️ Настройки InfiNews*\\n\\n` +
      `📊 Показано ранее: ${stats.seen} новостей\\n` +
      `📡 Источники: RSS (Lenta, Habr, TASS, RBC, Sports.ru, ...)\\n` +
      `\\u{1F9E0} GigaChat: ${GIGACHAT_CONFIG.ENABLED ? 'включён' : 'выключен'}`,
      { format: 'markdown', attachments: [MainKeyboards.getSettingsKeyboard(true)] },
    );
  },

  async admin(ctx) {
    if (!ctx.config?.isAdmin?.(ctx.user?.user_id)) {
      return ctx.reply('⛔ Эта команда доступна только администраторам.');
    }
    return ctx.reply(`*👑 Админ-панель InfiNews*`, {
      format: 'markdown',
      attachments: [MainKeyboards.getAdminKeyboard()],
    });
  },

  async config(ctx) {
    if (!ctx.config?.isAdmin?.(ctx.user?.user_id)) {
      return ctx.reply('⛔ Только для администраторов.');
    }
    return ctx.reply(
      `*🛠 Config*\\n\\nВаш ID: \\`${ctx.user?.user_id}\\`\\nДобавьте его в \\`max-bot/.env\\` → \\`ADMIN_IDS=\\` и перезапустите бота.`,
      { format: 'markdown' },
    );
  },

  async sources(ctx) {
    const lines = ['*📡 Источники новостей InfiNews*\\n'];
    for (const [key, cat] of Object.entries(RSS_SOURCES)) {
      lines.push(`${cat.label} \\`/cmd_${key}\\``);
      cat.feeds.forEach((f) => lines.push(`  • ${f}`));
    }
    return ctx.reply(lines.join('\\n'), { format: 'markdown' });
  },

  async digest(ctx) {
    const cats = Object.keys(RSS_SOURCES).filter((k) => k !== 'general');
    await ctx.reply('📦 Собираю дайджест по категориям...');
    const blocks = [];
    for (const k of cats) {
      try {
        const { articles } = await newsService.search(k, { limit: 2, markSeen: false });
        if (articles.length) {
          const header = `*${RSS_SOURCES[k].label}*`;
          const items = articles.map((a) => `• ${a.title}`).join('\\n');
          blocks.push(`${header}\\n${items}`);
        }
      } catch (e) {
        console.error('digest error:', e.message);
      }
    }
    if (!blocks.length) {
      return ctx.reply('📭 Дайджест пуст. Попробуй позже.');
    }
    return ctx.reply(`*📰 Дайджест InfiNews*\\n\\n${blocks.join('\\n\\n—\\n\\n')}`, {
      format: 'markdown',
      attachments: [MainKeyboards.getMainKeyboard()],
    });
  },

  async resetDedup(ctx) {
    if (!ctx.config?.isAdmin?.(ctx.user?.user_id)) {
      return ctx.reply('⛔ Только для админов.');
    }
    await newsService.clearDedup();
    return ctx.reply('🗑 Кэш дедупа очищен.');
  },

  async ask(ctx) {
    if (!GIGACHAT_CONFIG.ENABLED) {
      return ctx.reply('\\u{1F9E0} GigaChat не включён. Задай GIGACHAT_ENABLED=1 и креды в .env.');
    }
    const text = ctx.message?.body?.text || '';
    const m = text.match(/^\\/ask\\s+(\\S+)\\s+([\\s\\S]+)$/i);
    if (!m) {
      return ctx.reply(
        'Формат: `/ask <id> <вопрос>`\\nid можно посмотреть под новостью после нажатия «AI-саммари».',
        { format: 'markdown' },
      );
    }
    const [, id, question] = m;
    const article = newsService.findById(id);
    if (!article) {
      return ctx.reply('❌ Новость с таким id не найдена. Возможно, она устарела — посмотри свежие новости.');
    }
    await ctx.reply('🤔 Думаю...');
    const answer = await newsService.ask(id, question.trim());
    if (!answer) {
      return ctx.reply('❌ Не удалось получить ответ от GigaChat.');
    }
    return ctx.reply(`*\\u{1F9E0} ${article.title}*\\n\\n${answer}`, { format: 'markdown' });
  },
};
