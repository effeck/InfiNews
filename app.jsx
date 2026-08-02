import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const CATEGORIES = [
  { key: 'tech', label: '💻 Технологии' },
  { key: 'sports', label: '⚽ Спорт' },
  { key: 'politics', label: '🏛 Политика' },
  { key: 'business', label: '💼 Бизнес' },
  { key: 'science', label: '🔬 Наука' },
  { key: 'world', label: '🌍 Мир' },
];

const QUERIES = {
  tech: 'технологии IT гаджеты ИИ',
  sports: 'спорт футбол хоккей',
  politics: 'политика правительство',
  business: 'бизнес экономика финансы',
  science: 'наука космос открытия',
  world: 'мир события происшествия',
};

const formatDate = (iso) => (iso ? new Date(iso).toLocaleString('ru-RU') : '');

function Header() {
  return (
    <header className="app-header">
      <h1>📰 ИнфоПульс</h1>
      <p>Свежие новости по любому запросу</p>
    </header>
  );
}

function Search({ onSearch, loading }) {
  const [q, setQ] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) onSearch(q.trim());
  };
  return (
    <form className="search" onSubmit={submit}>
      <input
        type="text"
        placeholder="Поиск новостей..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !q.trim()}>
        {loading ? '⏳' : '🔍'}
      </button>
    </form>
  );
}

function Categories({ onPick, active }) {
  return (
    <div className="categories">
      {CATEGORIES.map((c) => (
        <button
          key={c.key}
          className={`chip ${active === c.key ? 'chip--active' : ''}`}
          onClick={() => onPick(c.key)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function ArticleCard({ a, onFav, isFav }) {
  return (
    <article className="card">
      <h3>{a.title}</h3>
      {a.description && <p>{a.description}</p>}
      <div className="meta">
        <span>📡 {a.source}</span>
        {a.publishedAt && <span>· {formatDate(a.publishedAt)}</span>}
      </div>
      <div className="actions">
        <a href={a.url} target="_blank" rel="noreferrer">Читать →</a>
        <button onClick={() => onFav(a)}>
          {isFav ? '★ В избранном' : '☆ В избранное'}
        </button>
      </div>
    </article>
  );
}

function Favorites({ items, onRemove, onClose }) {
  return (
    <section className="favorites">
      <h2>⭐ Избранное <button onClick={onClose}>×</button></h2>
      {items.length === 0 && <p>Пока пусто. Добавляйте понравившиеся статьи.</p>}
      {items.map((a) => (
        <ArticleCard
          key={a.url}
          a={a}
          isFav
          onFav={() => onRemove(a)}
        />
      ))}
    </section>
  );
}

const FAV_KEY = 'infopulse:favs';

function loadFavs() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveFavs(favs) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  } catch {}
}

function App() {
  const [articles, setArticles] = useState([]);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showFav, setShowFav] = useState(false);
  const [favs, setFavs] = useState(loadFavs);

  useEffect(() => saveFavs(favs), [favs]);

  // Demo-режим: тут подключите ваш бэкенд или прокси к gnews.io.
  // Без бэкенда возвращаем заглушки, чтобы UI был живой.
  const fetchNews = async (q) => {
    setLoading(true);
    setError(null);
    try {
      // TODO: заменить на реальный fetch('/api/news?q=' + encodeURIComponent(q))
      await new Promise((r) => setTimeout(r, 400));
      const items = Array.from({ length: 5 }).map((_, i) => ({
        title: `Новость по «${q}» №${i + 1}`,
        description: 'Демо-данные. Подключите NEWS_API_KEY в бэкенде, чтобы получать реальные новости.',
        url: 'https://example.com',
        source: 'infopulse-demo',
        publishedAt: new Date().toISOString(),
      }));
      setArticles(items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onSearch = (q) => {
    setQuery(q);
    setActiveCat(null);
    fetchNews(q);
  };
  const onPickCat = (key) => {
    setActiveCat(key);
    setQuery(QUERIES[key]);
    fetchNews(QUERIES[key]);
  };
  const toggleFav = (a) => {
    setFavs((prev) =>
      prev.find((x) => x.url === a.url)
        ? prev.filter((x) => x.url !== a.url)
        : [...prev, a],
    );
  };

  return (
    <div className="app">
      <Header />
      <Search onSearch={onSearch} loading={loading} />
      <Categories onPick={onPickCat} active={activeCat} />
      <button className="fav-toggle" onClick={() => setShowFav((v) => !v)}>
        ⭐ Избранное ({favs.length})
      </button>
      {error && <div className="error">⚠️ {error}</div>}
      {loading && <div className="loader">⏳ Загружаю новости...</div>}
      {!loading && query && (
        <h2 className="results-title">Результаты по «{query}»</h2>
      )}
      <div className="cards">
        {articles.map((a) => (
          <ArticleCard
            key={a.url}
            a={a}
            isFav={!!favs.find((x) => x.url === a.url)}
            onFav={toggleFav}
          />
        ))}
      </div>
      {showFav && (
        <Favorites
          items={favs}
          onRemove={toggleFav}
          onClose={() => setShowFav(false)}
        />
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
