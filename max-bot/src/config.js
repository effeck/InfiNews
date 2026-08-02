import 'dotenv/config';

const required = (name) => {
  const value = process.env[name];
  if (!value || value === `your_${name.toLowerCase()}_here`) {
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

export const BOT_CONFIG = {
  BOT_TOKEN: required('BOT_TOKEN'),
  WEB_APP_URL: process.env.WEB_APP_URL || 'http://localhost:5173',
  ADMIN_IDS: parseAdminIds(process.env.ADMIN_IDS),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

// Available quick-access news categories
export const NEWS_CATEGORIES = {
  tech: { label: '💻 Технологии', query: 'технологии IT гаджеты ИИ' },
  sports: { label: '⚽ Спорт', query: 'спорт футбол хоккей' },
  politics: { label: '🏛 Политика', query: 'политика правительство' },
  business: { label: '💼 Бизнес', query: 'бизнес экономика финансы' },
  science: { label: '🔬 Наука', query: 'наука космос открытия' },
  world: { label: '🌍 Мир', query: 'мир события происшествия' },
};
