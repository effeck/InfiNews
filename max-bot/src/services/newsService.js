// newsService — orchestrates RSS fetching, deduplication, and optional
// GigaChat enrichment. Also keeps an in-memory LRU of the last N results
// so the `/ask <id> <question>` command can answer follow-ups.

import { rssService } from './rssService.js';
import { dedup } from './dedupService.js';
import { gigachat } from './gigachatService.js';
import { RSS_SOURCES } from '../config.js';

const MAX_RECENT = 50;
const recent = []; // {id, article, ts}
let _idSeq = 1;

const genId = () => `a${Date.now().toString(36)}${(_idSeq++).toString(36)}`;

const stripHtml = (s) =>
  (s || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();

const truncate = (s, n = 240) => (s && s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);

const remember = (articles) => {
  for (const a of articles) {
    recent.unshift({ id: genId(), article: a, ts: Date.now() });
  }
  while (recent.length > MAX_RECENT) recent.pop();
};

const findById = (id) => recent.find((x) => x.id === id)?.article || null;

const escape = (s) => String(s || '').replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');

const formatArticle = (a, idx) => {
  const num = typeof idx === 'number' ? `${idx + 1}. ` : '';
  const lines = [`*${num}${escape(a.title)}*`];
  if (a.description) lines.push(escape(truncate(stripHtml(a.description), 200)));
  const meta = [];
  if (a.source) meta.push(`📡 ${escape(a.source)}`);
  if (a.publishedAt) {
    const d = new Date(a.publishedAt);
    if (!Number.isNaN(d.getTime())) {
      meta.push(d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }));
    }
  }
  if (meta.length) lines.push(meta.join(' · '));
  lines.push(`🔗 ${a.url}`);
  if (a.summary) lines.push(`\u{1F9E0} ${escape(a.summary)}`);
  if (a._id) lines.push(`_id: \`${a._id}\``);
  return lines.join('\n');
};

const formatResponse = (articles, header) => {
  if (!articles?.length) {
    return `${header}\n\nНичего нового не нашлось. Попробуй другую категорию или сбрось кэш: /reset_dedup`;
  }
  // Attach an in-memory id to each article so /ask can reference it.
  const withIds = articles.map((a) => ({ ...a, _id: genId() }));
  // Persist ids so we can find them in /ask.
  for (const a of withIds) recent.unshift({ id: a._id, article: a, ts: Date.now() });
  while (recent.length > MAX_RECENT) recent.pop();
  const blocks = withIds.map((a, i) => formatArticle(a, i));
  return `${header}\n\n${blocks.join('\n\n')}`;
};

export const newsService = {
  /**
   * Search by category (e.g. "tech") or by free-text query.
   * @param {string} query
   * @param {{limit?: number, enrich?: boolean, markSeen?: boolean}} opts
   */
  async search(query, opts = {}) {
    const limit = opts.limit || 7;
    const markSeen = opts.markSeen !== false;
    const enrich = opts.enrich && gigachat.isEnabled();

    let pool;
    if (RSS_SOURCES[query]) {
      pool = await rssService.fetchByCategory(query);
    } else if (!query || !String(query).trim()) {
      pool = await rssService.fetchByCategory('general');
    } else {
      pool = await rssService.searchByQuery(query, { limit: 50 });
    }

    if (!pool.length) return { articles: [], enriched: false };

    const unique = dedup.filterUnique(pool).slice(0, limit);
    if (markSeen) dedup.commit(unique);

    if (gigachat.isEnabled() && query && !RSS_SOURCES[query]) {
      gigachat.improveQuery(query).catch(() => {});
    }

    if (enrich) {
      const enriched = await Promise.all(
        unique.map(async (a) => {
          const summary = await gigachat.summarize(a);
          if (summary) a.summary = summary;
          return a;
        }),
      );
      return { articles: enriched, enriched: true };
    }

    return { articles: unique, enriched: false };
  },

  formatResponse,
  findById,

  async ask(articleId, question) {
    const article = findById(articleId);
    if (!article || !gigachat.isEnabled()) return null;
    return gigachat.askAboutArticle(article, question);
  },

  recent(limit = 10) {
    return recent.slice(0, limit).map((x) => ({
      id: x.id,
      title: x.article.title,
      source: x.article.source,
      url: x.article.url,
    }));
  },

  dedupStats() {
    return { seen: dedup.size() };
  },

  clearDedup() {
    return dedup.clear();
  },
};
