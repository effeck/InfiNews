import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOT_ROOT = path.resolve(__dirname, '..');

const required = (name, fallback = null) => {
  const value = process.env[name];
  if (!value) {
    if (fallback !== null) return fallback;
    console.warn(`⚠️  ${name} is not set. Some features may not work.`);
  }
  return value;
};

const parseAdminIds = (raw) => {
  if (!raw) return [];
  return raw
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
};

const parseList = (raw) =>
  (raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const parseInt = (raw, fallback) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const parseBool = (raw) => {
  if (raw == null) return false;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).toLowerCase());
};

export const BOT_CONFIG = {
  BOT_TOKEN: required('BOT_TOKEN'),
  WEB_APP_URL: process.env.WEB_APP_URL || 'http://localhost:5173',
  ADMIN_IDS: parseAdminIds(process.env.ADMIN_IDS),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// RSS sources. Users can extend via env: RSS_EXTRA=url1,url2
export const RSS_SOURCES = {
  tech: {
    label: '💻 Технологии',
    feeds: [
      'https://habr.com/ru/rss/all/',
      'https://www.opennet.ru/opennews/opennews_all.rss',
    ],
  },
  sports: {
    label: '⚽ Спорт',
    feeds: [
      'https://www.sports.ru/rss/news.xml',
      'https://www.championat.com/rss/news.xml',
    ],
  },
  politics: {
    label: '🏛 Политика',
    feeds: [
      'https://tass.ru/rss/v2.xml',
      'https://lenta.ru/rss/news',
    ],
  },
  business: {
    label: '💼 Бизнес',
    feeds: [
      'https://www.rbc.ru/rss/news',
      'https://tass.ru/rss/v2.xml',
    ],
  },
  science: {
    label: '🔬 Наука',
    feeds: [
      'https://habr.com/ru/rss/all/',
      'https://www.opennet.ru/opennews/opennews_all.rss',
    ],
  },
  world: {
    label: '🌍 Мир',
    feeds: [
      'https://lenta.ru/rss/news',
      'https://tass.ru/rss/v2.xml',
    ],
  },
  general: {
    label: '🗞 Главное',
    feeds: [
      'https://lenta.ru/rss/news',
      'https://www.rbc.ru/rss/news',
      'https://tass.ru/rss/v2.xml',
    ],
  },
};

// Extra custom feeds, applied to the "general" bucket by default.
export const EXTRA_RSS_FEEDS = parseList(process.env.RSS_EXTRA);

export const RSS_CONFIG = {
  // Total hard ceiling per request — protects against slow downstream feeds.
  TIMEOUT_MS: parseInt(process.env.RSS_TIMEOUT_MS, 8000),
  MAX_PER_FEED: parseInt(process.env.RSS_MAX_PER_FEED, 25),
  MAX_TOTAL: parseInt(process.env.RSS_MAX_TOTAL, 30),
  MAX_AGE_HOURS: parseInt(process.env.RSS_MAX_AGE_HOURS, 48),
  USER_AGENT: process.env.RSS_USER_AGENT || 'InfoPulseBot/1.0 (+https://github.com/effeck/InfoPulse-max-app)',
};

export const DEDUP_CONFIG = {
  CACHE_PATH: process.env.DEDUP_CACHE_PATH || path.join(BOT_ROOT, 'data', 'seen.json'),
  TTL_DAYS: parseInt(process.env.DEDUP_TTL_DAYS, 7),
  // Normalize titles: drop punctuation, lower, collapse spaces.
  // Two titles match if their normalized forms are equal OR share a Jaccard similarity above this.
  SIMILARITY_THRESHOLD: Number(process.env.DEDUP_SIMILARITY || 0.85),
};

export const GIGACHAT_CONFIG = {
  ENABLED: parseBool(process.env.GIGACHAT_ENABLED),
  // Either provide a pre-encoded Basic credential, or the raw pair (we encode internally).
  CREDENTIALS: process.env.GIGACHAT_CREDENTIALS || null,
  CLIENT_ID: process.env.GIGACHAT_CLIENT_ID || null,
  CLIENT_SECRET: process.env.GIGACHAT_CLIENT_SECRET || null,
  SCOPE: process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS',
  // OAuth endpoint. SaluteSpeech/GigaChat (Sber) uses a fixed pair; for physical persons: GIGACHAT_API_PERS.
  OAUTH_URL: process.env.GIGACHAT_OAUTH_URL || 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth',
  CHAT_URL: process.env.GIGACHAT_CHAT_URL || 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions',
  MODEL: process.env.GIGACHAT_MODEL || 'GigaChat',
  TIMEOUT_MS: parseInt(process.env.GIGACHAT_TIMEOUT_MS, 15000),
};

// Resolve effective credentials once at startup.
GIGACHAT_CONFIG._basicAuth = (() => {
  if (GIGACHAT_CONFIG.CREDENTIALS) return GIGACHAT_CONFIG.CREDENTIALS;
  if (GIGACHAT_CONFIG.CLIENT_ID && GIGACHAT_CONFIG.CLIENT_SECRET) {
    return Buffer.from(
      `${GIGACHAT_CONFIG.CLIENT_ID}:${GIGACHAT_CONFIG.CLIENT_SECRET}`,
    ).toString('base64');
  }
  return null;
})();

if (GIGACHAT_CONFIG.ENABLED && !GIGACHAT_CONFIG._basicAuth) {
  console.warn(
    '⚠️  GIGACHAT_ENABLED=1, но не задан ни GIGACHAT_CREDENTIALS, ни пара GIGACHAT_CLIENT_ID/SECRET. GigaChat будет пропускаться.',
  );
  GIGACHAT_CONFIG.ENABLED = false;
}
