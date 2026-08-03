// InfiNews · GigaChat integration (Sber) — OAuth2 + chat completions.
// Token is cached in-memory until expiry. On 401 we refresh once.
//
// Endpoints (defaults are the public ones for physical persons, scope GIGACHAT_API_PERS):
//   OAuth:  https://ngw.devices.sberbank.ru:9443/api/v2/oauth
//   Chat:   https://gigachat.devices.sberbank.ru/api/v1/chat/completions
//
// To obtain CLIENT_ID/CLIENT_SECRET, register at https://developers.sber.ru/

import { GIGACHAT_CONFIG } from '../config.js';

let _token = null;
let _tokenExpiresAt = 0;
let _inflight = null;

const TOKEN_SAFETY_MS = 30_000;

const needsToken = () => !_token || Date.now() >= _tokenExpiresAt - TOKEN_SAFETY_MS;

async function fetchToken() {
  if (!GIGACHAT_CONFIG.ENABLED) return null;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    const rk = Math.random().toString(36).slice(2, 10) + Date.now();
    const resp = await fetch(GIGACHAT_CONFIG.OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Authorization: `Basic ${GIGACHAT_CONFIG._basicAuth}`,
        'RqUID': rk,
      },
      body: 'scope=' + encodeURIComponent(GIGACHAT_CONFIG.SCOPE),
    });
    if (!resp.ok) {
      const text = await resp.text();
      _inflight = null;
      throw new Error(`GigaChat OAuth ${resp.status}: ${text.slice(0, 200)}`);
    }
    const data = await resp.json();
    if (!data?.access_token) {
      _inflight = null;
      throw new Error('GigaChat OAuth: нет access_token в ответе');
    }
    _token = data.access_token;
    _tokenExpiresAt = Date.now() + Number(data.expires_at || 30 * 60 * 1000);
    _inflight = null;
    return _token;
  })();

  try {
    return await _inflight;
  } catch (e) {
    _inflight = null;
    throw e;
  }
}

async function ensureToken() {
  if (!GIGACHAT_CONFIG.ENABLED) return null;
  if (needsToken()) await fetchToken();
  return _token;
}

async function chat(messages, opts = {}) {
  if (!GIGACHAT_CONFIG.ENABLED) return null;
  const token = await ensureToken();
  if (!token) return null;

  const body = {
    model: opts.model || GIGACHAT_CONFIG.MODEL,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.max_tokens ?? 800,
    stream: false,
  };

  const doRequest = async (useToken) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), GIGACHAT_CONFIG.TIMEOUT_MS);
    try {
      const resp = await fetch(GIGACHAT_CONFIG.CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${useToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return resp;
    } finally {
      clearTimeout(t);
    }
  };

  let resp = await doRequest(token);
  if (resp.status === 401) {
    _token = null;
    const fresh = await ensureToken();
    resp = await doRequest(fresh);
  }
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GigaChat ${resp.status}: ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content?.trim?.() || null;
}

// ---------- Public API ----------

export const gigachat = {
  isEnabled() {
    return GIGACHAT_CONFIG.ENABLED;
  },

  /** Improve a user query into a more search-friendly keyword set. */
  async improveQuery(query) {
    if (!GIGACHAT_CONFIG.ENABLED) return null;
    try {
      return await chat(
        [
          {
            role: 'system',
            content:
              'Ты помощник, который превращает пользовательский запрос в список из 2-4 ключевых слов для RSS-поиска новостей на русском. Ответь только словами через запятую, без пояснений.',
          },
          { role: 'user', content: query },
        ],
        { temperature: 0.2, max_tokens: 60 },
      );
    } catch (e) {
      console.warn('⚠️  InfiNews: GigaChat improveQuery failed:', e.message);
      return null;
    }
  },

  /** Short, neutral summary of a news article in Russian. */
  async summarize(article) {
    if (!GIGACHAT_CONFIG.ENABLED) return null;
    if (!article?.title) return null;
    try {
      return await chat(
        [
          {
            role: 'system',
            content:
              'Сделай краткое нейтральное резюме новости на русском языке (1-2 предложения, до 30 слов). Без оценок и домыслов. Если фактов мало — скажи «Недостаточно фактов».',
          },
          {
            role: 'user',
            content: `Заголовок: ${article.title}\nОписание: ${article.description || '—'}\nИсточник: ${article.source || '—'}`,
          },
        ],
        { temperature: 0.3, max_tokens: 200 },
      );
    } catch (e) {
      console.warn('⚠️  InfiNews: GigaChat summarize failed:', e.message);
      return null;
    }
  },

  /** Free-form chat about a single article. */
  async askAboutArticle(article, question) {
    if (!GIGACHAT_CONFIG.ENABLED) return null;
    if (!article?.title) return null;
    try {
      return await chat(
        [
          {
            role: 'system',
            content:
              'Ты ассистент новостного бота InfiNews. Тебе дают новость, отвечай по её содержанию коротко и по делу (1-3 предложения). Если в новости нет ответа — так и скажи.',
          },
          {
            role: 'user',
            content: `Новость:\nЗаголовок: ${article.title}\nОписание: ${article.description || '—'}\n\nВопрос: ${question}`,
          },
        ],
        { temperature: 0.5, max_tokens: 350 },
      );
    } catch (e) {
      console.warn('⚠️  InfiNews: GigaChat askAboutArticle failed:', e.message);
      return null;
    }
  },

  invalidateToken() {
    _token = null;
    _tokenExpiresAt = 0;
  },
};
