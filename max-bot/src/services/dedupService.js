// Dedup service (InfiNews) — drops articles that have already been shown
// to users (per the bot) within the configured TTL window.
//
// Strategy: combination of two fingerprints:
//   1) URL-based exact match (highest priority).
//   2) Title similarity (Jaccard over word shingles) above threshold.
//
// Persistence: tiny JSON file under data/seen.json. Format:
//   { "items": [ { "url": "...", "title": "...", "firstSeen": <epoch_ms> }, ... ] }

import fs from 'node:fs';
import path from 'node:path';
import { DEDUP_CONFIG } from '../config.js';

const STOP_WORDS = new Set([
  'и', 'в', 'во', 'на', 'но', 'а', 'что', 'это', 'как', 'к', 'ко', 'по', 'для', 'из', 'за', 'от',
  'the', 'a', 'an', 'in', 'on', 'of', 'to', 'for', 'with', 'and', 'or', 'is', 'are', 'was', 'were',
]);

const normalize = (s) => {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2018\u2019\u201c\u201d]/g, ' ')
    .replace(/[^a-zа-яё0-9\s]/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const tokenize = (s) => {
  const norm = normalize(s);
  if (!norm) return [];
  return norm
    .split(' ')
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
};

const shingles = (tokens, n = 2) => {
  if (tokens.length < n) return new Set(tokens);
  const out = new Set();
  for (let i = 0; i <= tokens.length - n; i++) {
    out.add(tokens.slice(i, i + n).join(' '));
  }
  return out;
};

const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
};

class DedupService {
  constructor() {
    this.items = [];
    this._loaded = false;
    this._saving = null;
    this._ensureDir();
    this._load();
    this._startGcInterval();
  }

  _ensureDir() {
    const dir = path.dirname(DEDUP_CONFIG.CACHE_PATH);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      if (e.code !== 'EEXIST') console.error('InfiNews dedup mkdir error:', e.message);
    }
  }

  _load() {
    if (this._loaded) return;
    try {
      if (fs.existsSync(DEDUP_CONFIG.CACHE_PATH)) {
        const raw = fs.readFileSync(DEDUP_CONFIG.CACHE_PATH, 'utf8');
        const data = JSON.parse(raw);
        if (Array.isArray(data?.items)) {
          this.items = data.items;
        }
      }
    } catch (e) {
      console.warn('⚠️  InfiNews: не удалось прочитать кэш дедупа, начинаем с пустого:', e.message);
      this.items = [];
    }
    this._gc();
    this._loaded = true;
  }

  _save() {
    if (this._saving) return this._saving;
    this._saving = (async () => {
      const tmp = DEDUP_CONFIG.CACHE_PATH + '.tmp';
      const data = JSON.stringify({ items: this.items });
      await fs.promises.writeFile(tmp, data, 'utf8');
      await fs.promises.rename(tmp, DEDUP_CONFIG.CACHE_PATH);
      this._saving = null;
    })();
    return this._saving;
  }

  _startGcInterval() {
    const HOUR = 60 * 60 * 1000;
    setInterval(() => this._gc(), HOUR).unref?.();
  }

  _gc() {
    const ttlMs = DEDUP_CONFIG.TTL_DAYS * 24 * 60 * 60 * 1000;
    const cutoff = Date.now() - ttlMs;
    const before = this.items.length;
    this.items = this.items.filter((it) => it.firstSeen >= cutoff);
    if (this.items.length !== before) {
      this._save().catch((e) => console.warn('InfiNews dedup save error:', e.message));
    }
  }

  isSeen(article) {
    const url = article?.url;
    const title = article?.title || '';
    if (url) {
      for (const it of this.items) {
        if (it.url === url) return true;
      }
    }
    const tokens = tokenize(title);
    if (!tokens.length) return false;
    const sh = shingles(tokens, 2);
    for (const it of this.items) {
      const otherTokens = tokenize(it.title);
      if (!otherTokens.length) continue;
      const otherSh = shingles(otherTokens, 2);
      if (jaccard(sh, otherSh) >= DEDUP_CONFIG.SIMILARITY_THRESHOLD) {
        return true;
      }
    }
    return false;
  }

  markSeen(article) {
    if (!article?.url && !article?.title) return;
    this.items.push({
      url: article.url || '',
      title: article.title || '',
      firstSeen: Date.now(),
    });
    if (this.items.length > 5000) {
      this.items = this.items.slice(-5000);
    }
    this._save().catch((e) => console.warn('InfiNews dedup save error:', e.message));
  }

  filterUnique(articles) {
    const out = [];
    for (const a of articles) {
      if (!this.isSeen(a)) out.push(a);
    }
    return out;
  }

  commit(articles) {
    for (const a of articles) this.markSeen(a);
  }

  size() {
    return this.items.length;
  }

  clear() {
    this.items = [];
    return this._save();
  }
}

export const dedup = new DedupService();
export { DedupService };
