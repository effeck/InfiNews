// RSS service for InfiNews — fetches news from configured feeds in
// parallel, normalizes items, filters out ancient entries and applies a
// per-feed cap. Each feed has its own timeout, so a single slow feed
// never blocks the whole request.

import Parser from 'rss-parser';
import { RSS_CONFIG, RSS_SOURCES, EXTRA_RSS_FEEDS } from '../config.js';

const parser = new Parser({
  timeout: RSS_CONFIG.TIMEOUT_MS,
  headers: {
    'User-Agent': RSS_CONFIG.USER_AGENT,
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['dc:creator', 'creator'],
      ['media:content', 'mediaContent', { keepArray: false }],
      ['content:encoded', 'contentEncoded'],
    ],
  },
});

const stripHtml = (s) =>
  (s || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const truncate = (s, n = 280) => (s && s.length > n ? `${s.slice(0, n - 1).trim()}…` : s);

const withinMaxAge = (isoDate) => {
  if (!isoDate) return true;
  const t = Date.parse(isoDate);
  if (!Number.isFinite(t)) return true;
  const ageMs = Date.now() - t;
  return ageMs <= RSS_CONFIG.MAX_AGE_HOURS * 3600 * 1000;
};

const guessSource = (feedUrl, fallback) => {
  try {
    const host = new URL(feedUrl).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return fallback || 'rss';
  }
};

const fetchOne = async (feedUrl) => {
  try {
    const feed = await parser.parseURL(feedUrl);
    const source = feed.title || guessSource(feedUrl);
    const items = (feed.items || []).slice(0, RSS_CONFIG.MAX_PER_FEED).map((it) => {
      const url = it.link || it.guid || '';
      const title = stripHtml(it.title || '');
      const description = stripHtml(
        it.contentSnippet || it.contentEncoded || it.summary || it.description || '',
      );
      return {
        title,
        description: truncate(description),
        url,
        source,
        publishedAt: it.isoDate || it.pubDate || null,
        author: it.creator || it.author || null,
        categories: Array.isArray(it.categories) ? it.categories : [],
      };
    }).filter((a) => a.title && a.url && withinMaxAge(a.publishedAt));
    return { ok: true, feedUrl, items };
  } catch (e) {
    console.warn(`⚠️  InfiNews RSS fetch failed: ${feedUrl} — ${e.message}`);
    return { ok: false, feedUrl, error: e.message, items: [] };
  }
};

const collectFeeds = (category) => {
  const cat = RSS_SOURCES[category];
  if (!cat) return [];
  const all = [...cat.feeds];
  if (category === 'general' && EXTRA_RSS_FEEDS.length) {
    all.push(...EXTRA_RSS_FEEDS);
  }
  return all;
};

const dedupeByUrl = (items) => {
  const seen = new Set();
  const out = [];
  for (const a of items) {
    if (!a.url || seen.has(a.url)) continue;
    seen.add(a.url);
    out.push(a);
  }
  return out;
};

const sortByDate = (items) => {
  return [...items].sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
};

export const rssService = {
  async fetchByCategory(category) {
    const feeds = collectFeeds(category);
    if (!feeds.length) return [];
    const results = await Promise.allSettled(feeds.map(fetchOne));
    const items = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.ok) {
        items.push(...r.value.items);
      }
    }
    return sortByDate(dedupeByUrl(items)).slice(0, RSS_CONFIG.MAX_TOTAL);
  },

  async searchByQuery(query, opts = {}) {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return this.fetchByCategory('general');

    const all = await this.fetchByCategory('general');
    if (!q) return all;

    const tokens = q.split(/\s+/).filter((t) => t.length > 1);
    const scored = all.map((a) => {
      const hay = `${a.title} ${a.description}`.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += hay.split(t).length - 1;
      }
      return { a, score };
    });
    return scored
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .map((x) => x.a)
      .slice(0, opts.limit || RSS_CONFIG.MAX_TOTAL);
  },
};
