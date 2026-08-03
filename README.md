# 📰 ИнфоПульс — новостной MAX-бот с GigaChat AI

MAX-бот, который тянет свежие новости из RSS-лент, убирает дубли, и (опционально) прогоняет их через GigaChat — краткие саммари, ответы на вопросы по статьям, дайджесты. В комплекте — мини-приложение на React/Vite.

---

## 🧭 Содержание

1. [Что внутри](#-что-внутри)
2. [Возможности](#-возможности)
3. [Структура репозитория](#-структура-репозитория)
4. [Быстрый старт](#-быстрый-старт)
5. [Переменные окружения (полная таблица)](#-переменные-окружения-полная-таблица)
6. [Где взять ключи](#-где-взять-ключи)
   * [MAX-бот: BOT_TOKEN](#max-бот-bot_token)
   * [GigaChat: CLIENT_ID / CLIENT_SECRET](#gigachat-client_id--client_secret)
7. [Запуск](#-запуск)
   * [Локальный long-polling](#локальный-long-polling)
   * [Webhook-режим](#webhook-режим)
   * [Docker](#docker)
8. [Команды бота (полный список)](#-команды-бота-полный-список)
9. [Как работают новости, дедупликация и GigaChat](#-как-работают-новости-дедупликация-и-gigachat)
10. [Кастомизация источников](#-кастомизация-источников)
11. [Деплой на VPS / PaaS](#-деплой-на-vps--paaS)
12. [Траблшутинг](#-траблшутинг)
13. [Разработка](#-разработка)
14. [Лицензия](#-лицензия)

---

## ✨ Что внутри

- **MAX-бот** на Node.js 18+, ESM, [@maxhub/max-bot-api](https://www.npmjs.com/package/@maxhub/max-bot-api).
- **RSS-агрегатор** на [rss-parser](https://www.npmjs.com/package/rss-parser) с параллельным опросом, таймаутами, фильтром по возрасту.
- **Дедупликатор** — URL + Jaccard-shingle по заголовкам, персистентный кэш в `data/seen.json` (TTL 7 дней по умолчанию).
- **GigaChat-клиент** — OAuth2 (Basic auth) + chat/completions, токен-кеш с авторефрешем.
- **Веб-приложение** — React 18 + Vite, dark theme, избранное через `localStorage`.

## 🧩 Возможности

- 🔍 Свободный поиск — пишите любой текст, бот ищет по RSS-источникам.
- 🗂 Категории — `/tech`, `/sports`, `/politics`, `/business`, `/science`, `/world`, `/general`.
- 📦 `/digest` — компактный дайджест по всем категориям в одном сообщении.
- 📡 `/sources` — какие ленты сейчас подключены.
- 🛡 Дедуп — бот **не повторяет** новости в течение TTL.
- 🧠 GigaChat (опционально):
  - **Саммари** статей (добавляется в выдачу).
  - **/ask `<id> <вопрос>`** — спросить AI про конкретную статью.
  - Улучшение поискового запроса (бэкграунд).
- 👑 Админ-панель: статистика, рассылки, сброс кэша.
- 🤖 Мини-приложение (Vite/React SPA) — открывается из бота.

## 📁 Структура репозитория

```
InfoPulse-max-app/
├── index.html              # Vite entry
├── app.jsx                 # React SPA (мини-приложение)
├── styles.css              # тёмная тема
├── package.json            # Vite + React
├── Dockerfile              # Prod-образ веб-приложения
├── docker-compose.yml      # dev-профиль
├── README.md               # вы тут
├── .env.example            # пример для веб-приложения
├── .gitignore
└── max-bot/                # MAX-бот
    ├── bot.js              # Long-polling точка входа
    ├── server.js           # Webhook-стаб (выключен по умолчанию)
    ├── package.json
    ├── .env.example
    └── src/
        ├── config.js                # .env → BOT_CONFIG + RSS/Dedup/GigaChat секции
        ├── mainKeyboards.js         # inline-кнопки
        ├── adminMiddleware.js       # ctx.config.isAdmin()
        ├── commandHandlers.js       # /start, /help, /digest, /ask, ...
        ├── callbackHandlers.js      # callback'и от кнопок
        └── services/
            ├── rssService.js        # параллельный RSS-fetch + нормализация
            ├── dedupService.js      # URL+Jaccard дедуп + JSON-кеш
            ├── gigachatService.js   # OAuth2 + 3 метода AI
            └── newsService.js       # оркестратор (RSS → dedup → AI)
```

## 🚀 Быстрый старт

```bash
# 1. Клонировать
git clone https://github.com/effeck/InfoPulse-max-app.git
cd InfoPulse-max-app

# 2. Веб-приложение (мини-приложение)
npm install
cp .env.example .env   # опционально

# 3. Бот
cd max-bot
npm install
cp .env.example .env   # обязательно — заполните ниже
```

Минимум для запуска бота — в `max-bot/.env`:

```env
BOT_TOKEN=<ваш токен MAX-бота>
ADMIN_IDS=<ваш numeric user id, узнать через /myid в боте>
```

Без GigaChat бот уже работает. Чтобы включить AI — добавьте секцию GigaChat (см. ниже).

## 🌐 Переменные окружения (полная таблица)

Все переменные читаются из `max-bot/.env`. Дефолты — в квадратных скобках.

| Переменная | Раздел | Дефолт | Что делает |
|---|---|---|---|
| `BOT_TOKEN` | Bot | — (обязательно) | Токен MAX-бота |
| `WEB_APP_URL` | Bot | `http://localhost:5173` | URL мини-приложения |
| `ADMIN_IDS` | Bot | `[]` | Comma-separated admin user IDs |
| `NODE_ENV` | Bot | `development` | `development` или `production` |
| `LOG_EVENTS` | Bot | `1` | Логировать все входящие события |
| `RSS_MAX_AGE_HOURS` | RSS | `48` | Максимальный возраст новости в часах |
| `RSS_MAX_TOTAL` | RSS | `30` | Жёсткий потолок на одну выдачу |
| `RSS_MAX_PER_FEED` | RSS | `25` | Сколько items брать с каждого feed |
| `RSS_TIMEOUT_MS` | RSS | `8000` | Per-feed HTTP-таймаут |
| `RSS_USER_AGENT` | RSS | `InfoPulseBot/1.0 ...` | User-Agent в запросах к RSS |
| `RSS_EXTRA` | RSS | `''` | Доп. фиды для категории `general` (через запятую) |
| `DEDUP_TTL_DAYS` | Dedup | `7` | Сколько дней помнить «уже показанные» |
| `DEDUP_CACHE_PATH` | Dedup | `./data/seen.json` | Путь к JSON-кешу дедупа |
| `DEDUP_SIMILARITY` | Dedup | `0.85` | Jaccard-порог для матча по заголовкам (0..1) |
| `GIGACHAT_ENABLED` | GigaChat | `0` | `1` — включает AI-функции |
| `GIGACHAT_CREDENTIALS` | GigaChat | `''` | Готовый base64 от `CLIENT_ID:CLIENT_SECRET` |
| `GIGACHAT_CLIENT_ID` | GigaChat | `''` | Auth key (Sber) |
| `GIGACHAT_CLIENT_SECRET` | GigaChat | `''` | Auth secret (Sber) |
| `GIGACHAT_SCOPE` | GigaChat | `GIGACHAT_API_PERS` | `GIGACHAT_API_PERS` / `_CORP` / `_B2B` |
| `GIGACHAT_MODEL` | GigaChat | `GigaChat` | `GigaChat` / `GigaChat-Pro` / `GigaChat-Max` |
| `GIGACHAT_TIMEOUT_MS` | GigaChat | `15000` | Per-request HTTP-таймаут |
| `GIGACHAT_OAUTH_URL` | GigaChat | (default) | Override OAuth endpoint |
| `GIGACHAT_CHAT_URL` | GigaChat | (default) | Override chat endpoint |
| `WEBHOOK_ENABLED` | Webhook | `0` | `1` — включает Express webhook-сервер |
| `WEBHOOK_URL` | Webhook | `''` | Публичный URL для webhook'а |
| `WEBHOOK_PORT` | Webhook | `3001` | Порт webhook-сервера |

## 🔐 Где взять ключи

### MAX-бот: `BOT_TOKEN`

1. Откройте [dev.max.ru](https://dev.max.ru).
2. Создайте бота → карточка бота → **Токен**.
3. Скопируйте токен в `max-bot/.env` → `BOT_TOKEN=...`.
4. Узнайте свой `user_id`: запустите бота, напишите ему `/myid` — в ответе будет `User ID`. Этот ID добавьте в `ADMIN_IDS=...`.

> Если в `dev.max.ru` требуется указать Webhook URL — оставьте пустым для long-polling, либо задайте публичный URL (см. webhook-режим ниже).

### GigaChat: `CLIENT_ID` / `CLIENT_SECRET`

1. Зарегистрируйтесь на [developers.sber.ru](https://developers.sber.ru/).
2. Создайте проект → включите **GigaChat API** (физическое лицо → scope `GIGACHAT_API_PERS`).
3. Получите `Client ID` (он же `Authorization key`) и `Client Secret`.
4. Положите их в `max-bot/.env`:
   ```env
   GIGACHAT_ENABLED=1
   GIGACHAT_CLIENT_ID=...
   GIGACHAT_CLIENT_SECRET=...
   GIGACHAT_SCOPE=GIGACHAT_API_PERS
   ```
5. Перезапустите бота. В `/start` теперь будет бейдж «AI-режим: включён».

> 💡 Альтернатива: подставьте готовый base64 от `CLIENT_ID:CLIENT_SECRET` в `GIGACHAT_CREDENTIALS` (полезно, если ваш хостинг не принимает multi-line secrets).

## ▶️ Запуск

### Локальный long-polling (рекомендуется для разработки)

```bash
cd max-bot
npm run dev      # с nodemon
# или
npm start
```

В логах должно появиться:

```
🔧 Инициализация InfoPulse MAX Bot...
✅ Команды бота установлены
🚀 Запуск InfoPulse MAX Bot...
✅ Бот подключен к серверам MAX!
```

Откройте MAX, найдите бота, нажмите **Start** — увидите приветствие.

### Webhook-режим

Только если вы развернули бота за HTTPS-доменом (Let's Encrypt, Cloudflare, etc.):

```bash
cd max-bot
WEBHOOK_ENABLED=1 \
WEBHOOK_URL=https://your.domain/webhook \
WEBHOOK_PORT=3001 \
npm start
```

Затем в [dev.max.ru](https://dev.max.ru) укажите `WEBHOOK_URL` для бота и сделайте reload.

### Docker (только веб-приложение)

```bash
docker compose up -d            # prod-профиль, раздаёт dist/
docker compose --profile dev up # Vite + HMR на :5173
```

## 🤖 Команды бота (полный список)

| Команда | Что делает |
|---|---|
| `/start` | Приветствие и главное меню |
| `/help` | Справка |
| `/chat` | Режим чата (тот же, что свободный текст) |
| `/tech` `/sports` `/politics` `/business` `/science` `/world` `/general` | Новости по категориям |
| `/digest` | Краткий дайджест по всем категориям |
| `/sources` | Список текущих RSS-источников |
| `/ask <id> <вопрос>` | Спросить GigaChat про статью (нужен включённый GigaChat) |
| `/settings` | Настройки + статистика дедупа |
| `/myid` | Показывает ваш User ID и Chat ID |
| `/admin` | Админ-панель (только для `ADMIN_IDS`) |
| `/config` | Показывает инструкцию, как стать админом |
| `/reset_dedup` | Сбросить кэш «уже показанных» (только админ) |
| *любой текст* | Свободный поиск по RSS |

### Пример `/ask`

```
/ask a4f3b2c1 что значит это решение для разработчиков?
```

ID видно внизу каждой выдачи (под URL, в строке `_id: a4f3b2c1`).

## 🧠 Как работают новости, дедупликация и GigaChat

Поток при запросе:

```
message → bot.on('message_created')
   → newsService.search(query)
     → rssService.fetchByCategory('general')  // параллельный fetch всех фидов
       → RSS_CONFIG.TIMEOUT_MS на каждый feed
       → фильтр RSS_CONFIG.MAX_AGE_HOURS
       → cap RSS_CONFIG.MAX_PER_FEED → RSS_CONFIG.MAX_TOTAL
     → dedup.filterUnique()    // URL + Jaccard
     → dedup.commit()          // пометить как показанные
     → [опц.] gigachat.summarize() для каждой статьи
   → newsService.formatResponse() → ctx.reply()
```

**Дедупликация** хранит `{url, title, firstSeen}` в `data/seen.json` (UTF-8, читается при старте). Старше `DEDUP_TTL_DAYS` — удаляются (GC раз в час). Лимит in-memory — 5000 записей.

**GigaChat**:
- Токен кешируется в памяти, обновляется за 30 сек до истечения (`expires_at` из ответа OAuth).
- На `401` — токен инвалидируется, запрос повторяется один раз.
- Три метода:
  - `improveQuery(q)` → список ключевых слов (бэкграунд).
  - `summarize(article)` → краткое саммари (до 30 слов).
  - `askAboutArticle(article, q)` → ответ на вопрос по статье.

## 📡 Кастомизация источников

Источники зашиты в `max-bot/src/config.js` → `RSS_SOURCES`. Меняйте под себя:

```js
export const RSS_SOURCES = {
  tech: {
    label: '💻 Технологии',
    feeds: [
      'https://habr.com/ru/rss/all/',
      'https://www.opennet.ru/opennews/opennews_all.rss',
      // добавьте свой фид
    ],
  },
  // ... другие категории
};
```

Хотите **добавить фид без правки кода**? Положите URL в `RSS_EXTRA=https://...` (через запятую) — он попадёт в категорию `general`.

## 🛠 Деплой на VPS / PaaS

### Любой VPS (systemd)

```ini
# /etc/systemd/system/infopulse-bot.service
[Unit]
Description=InfoPulse MAX Bot
After=network.target

[Service]
Type=simple
User=infopulse
WorkingDirectory=/opt/infopulse/max-bot
EnvironmentFile=/opt/infopulse/max-bot/.env
ExecStart=/usr/bin/node bot.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now infopulse-bot
sudo journalctl -u infopulse-bot -f   # логи
```

### PM2

```bash
cd max-bot
npm i -g pm2
pm2 start bot.js --name infopulse-bot
pm2 startup
pm2 save
pm2 logs infopulse-bot
```

### Docker (бот)

Создайте `max-bot/Dockerfile` (если нужно):

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "bot.js"]
```

```bash
cd max-bot
docker build -t infopulse-bot .
docker run -d --name infopulse --env-file .env infopulse-bot
```

## 🆘 Траблшутинг

| Симптом | Причина / Что делать |
|---|---|
| Бот не запускается: `❌ BOT_TOKEN is missing` | В `max-bot/.env` нет `BOT_TOKEN=...` или файл не подхватился. Проверьте, что `cp .env.example .env` сделан и вы **в директории `max-bot/`**. |
| `/start` работает, а `/admin` — «только для админов» | Добавьте ваш User ID (из `/myid`) в `ADMIN_IDS=` и перезапустите бота. |
| Все новости — дубликаты, ничего не приходит | Уже всё показано. Сбросьте: `/reset_dedup` (админ) или удалите `data/seen.json`. |
| `GigaChat summarize failed: GigaChat OAuth 401` | Неверные креды. Перевыпустите `CLIENT_ID` / `CLIENT_SECRET` на developers.sber.ru. |
| `GigaChat OAuth 403` | Скорее всего, scope `GIGACHAT_API_CORP`, а у вас физ. лицо. Поставьте `GIGACHAT_SCOPE=GIGACHAT_API_PERS`. |
| RSS-фид `opennet` падает с 403 | У сайта включён блок по User-Agent. Уже зашит нормальный, но если провайдер режет — поменяйте `RSS_USER_AGENT`. |
| Бот подключается, но событий не видит | Проверьте, что в [dev.max.ru](https://dev.max.ru) webhook пустой (для long-polling). |
| `node --check` ругается на ESM-импорты | Убедитесь, что в `max-bot/package.json` есть `"type": "module"`. |
| `/ask` пишет «GigaChat не включён» | `GIGACHAT_ENABLED=1` + корректные креды в `.env` + перезапуск бота. |
| После `git pull` сломалось | Скорее всего, изменился `config.js`. Сверьте свой `.env` с новым `.env.example`. |

## 👨‍💻 Разработка

- `npm run dev` в `max-bot/` — автоперезагрузка через `nodemon`.
- `LOG_EVENTS=0` — выключить лог входящих событий (когда шумно).
- `npm run debug` — Node Inspector на порту 9229.
- `data/seen.json` — добавьте в `.gitignore` (уже там), чтобы не коммитить локальный кэш дедупа.
- Тесты: пока нет. Можно добавить `vitest` для сервисов (`rssService`, `dedupService`).

## 📝 Лицензия

MIT
