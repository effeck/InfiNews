// News fetching + formatting service.
// By default uses the public gnews.io free tier. Override via env: NEWS_PROVIDER.

const DEFAULT_PROVIDER = process.env.NEWS_PROVIDER || 'mock';

const stripHtml = (s) =>
  (s || '').replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();

const truncate = (s, n = 220) => {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1).trim()}…` : s;
};

async function searchMock(query, limit) {
  // Mock provider: works without external API, useful for dev and offline tests.
  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  return Array.from({ length: limit }).map((_, i) => ({
    title: `[Demo] ${query} — событие #${i + 1} (${stamp})`,
    description: `Демо-новость по запросу «${query}». Чтобы получать реальные новости, задайте NEWS_API_KEY в .env и переключите NEWS_PROVIDER=gnews.`,
    url: 'https://example.com',
    source: 'infopulse-demo',
    publishedAt: now.toISOString(),
  }));
}

async function searchGnews(query, limit, apiKey) {
  const url = new URL('https://gnews.io/api/v4/search');
  url.searchParams.set('q', query);
  url.searchParams.set('lang', 'ru');
  url.searchParams.set('max', String(Math.min(limit, 10)));
  url.searchParams.set('apikey', apiKey);

  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`GNews error ${resp.status}: ${body.slice(0, 200)}`);
  }
  const data = await resp.json();
  return (data.articles || []).map((a) => ({
    title: a.title,
    description: a.description,
    url: a.url,
    source: a.source?.name || 'unknown',
    publishedAt: a.publishedAt,
  }));
}

export const NewsService = {
  async searchNews(query, limit = 5) {
    const safeQuery = String(query || '').trim();
    if (!safeQuery) return [];
    const provider = process.env.NEWS_PROVIDER || DEFAULT_PROVIDER;
    const apiKey = process.env.NEWS_API_KEY;

    if (provider === 'gnews' && apiKey) {
      try {
        return await searchGnews(safeQuery, limit, apiKey);
      } catch (e) {
        console.error('❌ GNews failed, falling back to mock:', e.message);
        return searchMock(safeQuery, limit);
      }
    }
    return searchMock(safeQuery, limit);
  },

  formatNewsResponse(articles, query) {
    if (!articles || !articles.length) {
      return `❌ По запросу «${query}» ничего не нашлось.\n\nПопробуйте другие ключевые слова.`;
    }
    const lines = [`📰 *${articles.length} новостей по запросу «${query}»:*\n`];
    articles.forEach((a, i) => {
      lines.push(
        `*${i + 1}. ${a.title}*\n` +
          `${truncate(stripHtml(a.description), 180)}\n` +
          `🔗 ${a.url}\n` +
          `📡 ${a.source} · ${(a.publishedAt || '').slice(0, 10)}\n`,
      );
    });
    return lines.join('\n');
  },
};
