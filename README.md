# 📰 ИнфоПульс — новостной MAX-бот

MAX-бот и мини-приложение, которое ищет новости по любому запросу и по популярным категориям (технологии, спорт, политика, бизнес, наука, мир).

- Источник новостей: [gnews.io](https://gnews.io) (если задан `NEWS_API_KEY`) или встроенный demo-режим.
- Платформа: Node.js 18+, ESM, [@maxhub/max-bot-api](https://www.npmjs.com/package/@maxhub/max-bot-api).
- Веб-фронт: React 18 + Vite.

## 🚀 Возможности

- 💬 Свободный поиск — пишите любой текст, бот ищет новости.
- 🗂 Категории — /tech, /sports, /politics, /business, /science, /world.
- ⚙️ Настройки — уведомления, тема, статистика.
- 👑 Админ-панель — статистика, рассылки, управление (только для `ADMIN_IDS`).
- 🤖 Мини-приложение — Vite/React SPA, открывается из бота.

## 🏗 Структура

```
InfoPulse-max-app/
├── index.html              # Vite entry
├── app.jsx                 # React SPA (мини-приложение)
├── package.json            # Vite + React
├── Dockerfile              # Prod-образ веб-приложения
├── docker-compose.yml      # dev-профиль
└── max-bot/                # MAX-бот
    ├── bot.js              # Long-polling точка входа
    ├── server.js           # Webhook-стаб (выключен по умолчанию)
    ├── package.json
    └── src/
        ├── config.js            # .env → BOT_CONFIG
        ├── mainKeyboards.js     # inline-кнопки
        ├── adminMiddleware.js   # ctx.config.isAdmin()
        ├── commandHandlers.js   # /start, /help, /chat, ...
        ├── callbackHandlers.js  # callback'и от кнопок
        └── services/
            └── newsService.js   # поиск + форматирование
```

## ⚙️ Установка

```bash
# 1. Клонировать
git clone https://github.com/effeck/InfoPulse-max-app.git
cd InfoPulse-max-app

# 2. Зависимости веб-приложения
npm install

# 3. Зависимости бота
cd max-bot
npm install
cp .env.example .env   # затем отредактировать .env
cd ..
```

## 🔐 Переменные окружения (max-bot/.env)

| Переменная         | Описание                                                                 |
| ------------------ | ------------------------------------------------------------------------ |
| `BOT_TOKEN`        | Токен бота из [dev.max.ru](https://dev.max.ru)                           |
| `WEB_APP_URL`      | Публичный URL мини-приложения (по умолчанию `http://localhost:5173`)     |
| `ADMIN_IDS`        | ID админов через запятую. Узнать свой: `/myid` в боте                    |
| `NEWS_PROVIDER`    | `gnews` (по умолчанию в коде) или `mock`                                 |
| `NEWS_API_KEY`     | Ключ [gnews.io](https://gnews.io). Без него работает demo-режим          |
| `WEBHOOK_ENABLED`  | `1` — включить webhook-сервер на `WEBHOOK_PORT` (по умолчанию выключен)  |
| `WEBHOOK_PORT`     | Порт webhook-сервера (по умолчанию `3001`)                               |
| `WEBHOOK_URL`      | Публичный URL для webhook'ов                                             |

## ▶️ Запуск

### Веб-приложение

```bash
npm run dev      # http://localhost:5173
npm run build    # продакшн-сборка → dist/
```

### Бот (long-polling, основной режим)

```bash
cd max-bot
npm run dev      # авто-перезагрузка через nodemon
npm start        # production
```

### Бот (webhook-режим)

```bash
cd max-bot
WEBHOOK_ENABLED=1 WEBHOOK_URL=https://your.domain/webhook npm start
```

## 🐳 Docker

```bash
# Только веб-приложение
docker compose up -d

# Dev-профиль (Vite + HMR на :5173)
docker compose --profile dev up
```

## 🤖 Команды бота

- `/start` — приветствие и меню
- `/help` — справка
- `/chat` — режим чата
- `/tech`, `/sports`, `/politics`, `/business`, `/science`, `/world` — новости по категории
- `/settings` — настройки
- `/myid` — ваш User ID (нужен для `ADMIN_IDS`)
- `/admin` — админ-панель

Любой другой текст воспринимается как поисковый запрос.

## 🔍 Источники новостей

- **Без ключа** — demo-режим, бот возвращает 5 заглушек (полезно для разработки).
- **С `NEWS_API_KEY`** — реальный поиск через [gnews.io](https://gnews.io) (бесплатный тариф — 100 запросов/день). Зарегистрируйтесь, получите API key, добавьте в `.env`.

## 🛠 Разработка

- Бот работает в long-polling. Для отладки: `npm run debug` (node --inspect).
- Логи — в stdout. Каждый update логируется с user_id и текстом.
- Чтобы сменить категории — редактируйте `NEWS_CATEGORIES` в `max-bot/src/config.js`.

## 🆘 Если что-то не работает

1. **Бот не запускается** — проверьте, что в `max-bot/.env` есть валидный `BOT_TOKEN`.
2. **Поиск возвращает demo-новости** — добавьте `NEWS_API_KEY` (gnews.io) или поменяйте провайдера.
3. **Кнопки не отвечают** — смотрите, нет ли ошибок в консоли. Версия `@maxhub/max-bot-api` должна быть совместима с long-polling.
4. **`/admin` пишет «только для админов»** — добавьте свой User ID в `ADMIN_IDS` и перезапустите бота.

## 📝 Лицензия

MIT
