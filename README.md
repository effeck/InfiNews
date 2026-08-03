# 📰 InfiNews — новостной MAX-бот с GigaChat AI

> **InfiNews** — это бот для мессенджера **MAX**, который тянет свежие новости из RSS-лент, убирает дубли, и (опционально) прогоняет их через нейросеть **GigaChat** от Сбера: делает краткие саммари, отвечает на вопросы по статьям, улучшает поисковые запросы. В комплекте — мини-приложение на React/Vite.

---

## 🔥 Что умеет бот

- **Свободный поиск.** Пишите любой текст — бот ищет новости по всем RSS-источникам и сортирует выдачу по релевантности.
- **7 категорий.** `/tech` `/sports` `/politics` `/business` `/science` `/world` `/general` — каждая тянется из 2–3 RSS-фидов параллельно.
- **Дедупликация.** Бот **запоминает** каждую новость по URL и заголовку (Jaccard-shingle) и не показывает её повторно в течение 7 дней. Кэш — в `data/seen.json`.
- **🧠 GigaChat AI (опционально).** При включении:
  - делает краткое саммари (до 30 слов) к каждой новости в выдаче;
  - понимает команду `/ask <id> <вопрос>` — отвечает по конкретной статье;
  - бэкграундом улучшает ваш поисковый запрос для более точных результатов.
- **📦 Дайджест.** Команда `/digest` — компактная сводка топ-2 новостей по каждой категории в одном сообщении.
- **📡 Список источников.** `/sources` показывает все активные RSS-ленты.
- **👑 Админ-панель.** По `ADMIN_IDS` — статистика, рассылки, сброс кэша дедупа.
- **🤖 Мини-приложение** на Vite/React (SPA) — открывается из бота, имеет тёмную тему и избранное через `localStorage`.

### Источники, которые уже подключены

| Категория | Ленты |
|---|---|
| 💻 Технологии | Habr (все посты), OpenNet |
| ⚽ Спорт | Sports.ru, Championat.com |
| 🏛 Политика | TASS, Lenta.ru |
| 💼 Бизнес | RBC, TASS |
| 🔬 Наука | Habr, OpenNet |
| 🌍 Мир | Lenta.ru, TASS |
| 🗞 Главное | Lenta, RBC, TASS + всё из `RSS_EXTRA` |

Все источники живут в `max-bot/src/config.js` → `RSS_SOURCES` — добавляйте свои.

---

## 🧭 Содержание

1. [Что внутри](#-что-внутри)
2. [Структура репозитория](#-структура-репозитория)
3. [Быстрый старт](#-быстрый-старт)
4. [Подробная настройка (пошагово)](#-подробная-настройка-пошагово)
   * 4.1. [Регистрация MAX-бота](#41-регистрация-max-бота)
   * 4.2. [Получение `BOT_TOKEN`](#42-получение-bot_token)
   * 4.3. [Узнать свой `user_id` (для `ADMIN_IDS`)](#43-узнать-свой-user_id-для-admin_ids)
   * 4.4. [Регистрация в GigaChat](#44-регистрация-в-gigachat-опционально)
   * 4.5. [Заполнение `.env`](#45-заполнение-env)
   * 4.6. [Установка и запуск](#46-установка-и-запуск)
5. [Переменные окружения (полная таблица)](#-переменные-окружения-полная-таблица)
6. [Команды бота (полный список)](#-команды-бота-полный-список)
7. [Как работают новости, дедупликация и GigaChat](#-как-работают-новости-дедупликация-и-gigachat)
8. [Кастомизация источников](#-кастомизация-источников)
9. [Запуск: long-polling vs webhook](#-запуск-long-polling-vs-webhook)
10. [Деплой на VPS / PaaS / Docker](#-деплой-на-vps--paaS--docker)
11. [Траблшутинг](#-траблшутинг)
12. [Разработка](#-разработка)
13. [Лицензия](#-лицензия)

---

## ✨ Что внутри

- **MAX-бот** на Node.js 18+, ESM, [@maxhub/max-bot-api](https://www.npmjs.com/package/@maxhub/max-bot-api).
- **RSS-агрегатор** на [rss-parser](https://www.npmjs.com/package/rss-parser) с параллельным опросом, per-feed таймаутами, фильтром по возрасту, URL-дедупом и keyword-скорингом.
- **Дедупликатор** — URL + Jaccard-shingle по заголовкам, persistent cache в `data/seen.json` (TTL 7 дней по умолчанию), in-memory cap 5000 записей.
- **GigaChat-клиент** — OAuth2 (Basic auth), токен-кеш с авторефрешем, retry на 401, 3 метода: `improveQuery`, `summarize`, `askAboutArticle`.
- **Веб-приложение** — React 18 + Vite, тёмная тема, избранное через `localStorage`.

## 📁 Структура репозитория

```
InfiNews/
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

## 🚀 Быстрый старт (TL;DR)

```bash
git clone https://github.com/effeck/InfiNews.git
cd InfiNews

# Веб-приложение (по желанию)
npm install
npm run dev          # → http://localhost:5173

# Бот
cd max-bot
npm install
cp .env.example .env # заполните — см. раздел ниже
npm start
```

Минимум для запуска бота — в `max-bot/.env`:

```env
BOT_TOKEN=<ваш токен MAX-бота>
ADMIN_IDS=<ваш numeric user id>
```

Без GigaChat бот уже работает (новости, дедуп, дайджест). Чтобы включить AI — см. шаг 4.4.

## 🛠 Подробная настройка (пошагово)

### 4.1. Регистрация MAX-бота

1. Откройте [dev.max.ru](https://dev.max.ru) — это консоль разработчика MAX.
2. Войдите через ваш MAX-аккаунт.
3. Нажмите **«Создать бот»** (или аналогичную кнопку в дашборде).
4. Заполните:
   - **Имя** — публичное имя бота (например, `InfiNews`).
   - **Username** — уникальный @handle, по которому бота можно найти (например, `@infinews_bot`).
   - **Описание** — короткий текст о боте.
   - **Аватар** (опционально).
5. Подтвердите создание.

### 4.2. Получение `BOT_TOKEN`

1. В карточке только что созданного бота найдите поле **«Токен»** (часто подписан как `Bot token` / `API token`).
2. Нажмите **«Показать»** / **«Скопировать»**.
3. Скопируйте токен (длинная строка вида `eyJhbGciOi...`).
4. **Никогда не коммитьте токен в git.** Положите его в `max-bot/.env`:
   ```env
   BOT_TOKEN=eyJhbGciOi...
   ```

> ⚠️ Если токен утёк — в карточке бота есть кнопка **«Сбросить токен»**. После сброса старый токен перестаёт работать через минуту.

### 4.3. Узнать свой `user_id` (для `ADMIN_IDS`)

1. Запустите бота **первый раз** с пустым `ADMIN_IDS=`:
   ```env
   BOT_TOKEN=eyJhbGciOi...
   ADMIN_IDS=
   ```
2. В MAX откройте вашего бота и нажмите **Start** (или `/start`).
3. Отправьте команду `/myid` — бот ответит чем-то вроде:
   ```
   *👤 Ваши идентификаторы:*
   *User ID:* `123456789`
   *Chat ID:* `987654321`
   *Username:* yourname
   ```
4. Скопируйте `User ID` и впишите в `max-bot/.env`:
   ```env
   ADMIN_IDS=123456789
   ```
5. Перезапустите бота. После этого `/admin` и `/reset_dedup` будут вам доступны.

> 💡 Можно указать несколько ID через запятую: `ADMIN_IDS=111,222,333`.

### 4.4. Регистрация в GigaChat (опционально)

> Этот шаг нужен только если хотите саммари и `/ask`. Без него бот работает как обычный RSS-агрегатор.

1. Откройте [developers.sber.ru](https://developers.sber.ru/) и зарегистрируйтесь (или войдите).
2. Перейдите в раздел **«GigaChat API»** → **«Создать проект»** (или **«Подключить»**).
3. Выберите тип:
   - **Физическое лицо** → scope будет `GIGACHAT_API_PERS` (по умолчанию в `.env.example`).
   - **Юридическое лицо** → `GIGACHAT_API_CORP` (потребуется подписать договор).
4. После создания проекта вы получите:
   - **Authorization key** (он же `CLIENT_ID`).
   - **Client secret** (он же `CLIENT_SECRET`).
5. Впишите их в `max-bot/.env`:
   ```env
   GIGACHAT_ENABLED=1
   GIGACHAT_CLIENT_ID=<ваш Authorization key>
   GIGACHAT_CLIENT_SECRET=<ваш Client secret>
   GIGACHAT_SCOPE=GIGACHAT_API_PERS
   ```
6. Перезапустите бота. В `/start` теперь будет бейдж «AI-режим: включён».
7. Проверьте: `/tech` → под новостями должна быть строка `🤖 <саммари>` и `_id: a4f3b2c1`. Скопируйте id и напишите `/ask a4f3b2c1 краткий итог?` — GigaChat ответит.

> 💡 **Альтернатива `CLIENT_ID/SECRET`:** некоторые хостинги (Vercel, Railway) не любят multi-line secrets. Тогда base64 от `CLIENT_ID:CLIENT_SECRET` можно положить одной строкой в `GIGACHAT_CREDENTIALS=...`. Сгенерировать: `echo -n "$ID:$SECRET" | base64`.

### 4.5. Заполнение `.env`

Откройте `max-bot/.env` и заполните нужные поля. Все переменные с дефолтами и пояснениями — в [следующем разделе](#-переменные-окружения-полная-таблица).

**Обязательные:**
- `BOT_TOKEN` — токен MAX-бота (см. шаг 4.2).
- `ADMIN_IDS` — ваш user ID (см. шаг 4.3).

**Рекомендуемые:**
- `WEB_APP_URL` — URL мини-приложения (для прод — ваш домен; для dev — `http://localhost:5173`).

**Опциональные (GigaChat):**
- `GIGACHAT_ENABLED=1`
- `GIGACHAT_CLIENT_ID=...`
- `GIGACHAT_CLIENT_SECRET=...`

**Тонкая настройка** — оставьте дефолты, если не уверены.

### 4.6. Установка и запуск

```bash
cd max-bot
npm install
npm start
```

В логах должно появиться:

```
🔧 Инициализация InfiNews MAX Bot...
✅ Команды бота установлены
🚀 Запуск InfiNews MAX Bot...
✅ Бот подключен к серверам MAX!
```

Откройте MAX → найдите бота по @username → нажмите **Start**. Если всё ок, увидите приветствие с клавиатурой.

Для разработки с авто-перезагрузкой:
```bash
npm run dev     # nodemon следит за файлами
```

## 🌐 Переменные окружения (полная таблица)

Все переменные читаются из `max-bot/.env`. Дефолты — в квадратных скобках.

### Основное (бот)

| Переменная | Дефолт | Обязательно | Что делает |
|---|---|---|---|
| `BOT_TOKEN` | — | ✅ | Токен MAX-бота из [dev.max.ru](https://dev.max.ru) |
| `WEB_APP_URL` | `http://localhost:5173` | — | Публичный URL мини-приложения |
| `ADMIN_IDS` | `[]` | — | Comma-separated user ID админов. Узнать свой: `/myid` |
| `NODE_ENV` | `development` | — | `development` или `production` |
| `LOG_EVENTS` | `1` | — | Логировать все входящие события в stdout |

### RSS

| Переменная | Дефолт | Что делает |
|---|---|---|
| `RSS_MAX_AGE_HOURS` | `48` | Старше этого — отбрасываем. 0 = без фильтра |
| `RSS_MAX_TOTAL` | `30` | Жёсткий потолок на одну выдачу |
| `RSS_MAX_PER_FEED` | `25` | Сколько items брать с каждого feed до глобальной нарезки |
| `RSS_TIMEOUT_MS` | `8000` | Per-feed HTTP-таймаут (мс). Медленные фиды просто пропускаются |
| `RSS_USER_AGENT` | `InfiNewsBot/1.0 ...` | User-Agent в запросах к RSS |
| `RSS_EXTRA` | `''` | Доп. фиды для категории `general` (через запятую) |

### Дедупликация

| Переменная | Дефолт | Что делает |
|---|---|---|
| `DEDUP_TTL_DAYS` | `7` | Сколько дней помнить «уже показанные» |
| `DEDUP_CACHE_PATH` | `./data/seen.json` | Путь к JSON-кешу дедупа (создаётся автоматически) |
| `DEDUP_SIMILARITY` | `0.85` | Jaccard-порог для матча по заголовкам (0..1). Ниже — строже |

### GigaChat (опционально)

| Переменная | Дефолт | Что делает |
|---|---|---|
| `GIGACHAT_ENABLED` | `0` | `1` — включает AI-функции (саммари + /ask) |
| `GIGACHAT_CREDENTIALS` | `''` | Готовый base64 от `CLIENT_ID:CLIENT_SECRET` (альтернатива двум полям ниже) |
| `GIGACHAT_CLIENT_ID` | `''` | Authorization key из [developers.sber.ru](https://developers.sber.ru/) |
| `GIGACHAT_CLIENT_SECRET` | `''` | Client secret оттуда же |
| `GIGACHAT_SCOPE` | `GIGACHAT_API_PERS` | `GIGACHAT_API_PERS` (физ. лица) / `_CORP` / `_B2B` |
| `GIGACHAT_MODEL` | `GigaChat` | `GigaChat` / `GigaChat-Pro` / `GigaChat-Max` (платный) |
| `GIGACHAT_TIMEOUT_MS` | `15000` | Per-request HTTP-таймаут |
| `GIGACHAT_OAUTH_URL` | (default) | Override OAuth endpoint (если Сбер поменяет) |
| `GIGACHAT_CHAT_URL` | (default) | Override chat endpoint |

### Webhook (опционально)

| Переменная | Дефолт | Что делает |
|---|---|---|
| `WEBHOOK_ENABLED` | `0` | `1` — включает Express webhook-сервер из `server.js` |
| `WEBHOOK_URL` | `''` | Публичный URL, на который MAX будет слать обновления |
| `WEBHOOK_PORT` | `3001` | Порт webhook-сервера |

## 🤖 Команды бота (полный список)

| Команда | Что делает |
|---|---|
| `/start` | Приветствие и главное меню |
| `/help` | Полная справка (выжимка из этого README) |
| `/chat` | Режим чата (эквивалент свободного текста) |
| `/tech` `/sports` `/politics` `/business` `/science` `/world` `/general` | Новости по категориям |
| `/digest` | Краткий дайджест по всем категориям (топ-2 на каждую) |
| `/sources` | Список текущих RSS-источников с URL |
| `/ask <id> <вопрос>` | Спросить GigaChat про конкретную статью |
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

**GigaChat:**
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

## ▶️ Запуск: long-polling vs webhook

### Long-polling (рекомендуется для dev и небольших ботов)

Бот сам опрашивает серверы MAX. Никакого публичного URL не нужно.

```bash
cd max-bot
npm start
```

### Webhook

Только если вы развернули бота за HTTPS-доменом (Let's Encrypt, Cloudflare, etc.):

```bash
cd max-bot
WEBHOOK_ENABLED=1 \
WEBHOOK_URL=https://your.domain/webhook \
WEBHOOK_PORT=3001 \
npm start
```

Затем в [dev.max.ru](https://dev.max.ru) → карточка бота → **Webhook URL** укажите `https://your.domain/webhook` и сохраните.

## 🐳 Деплой на VPS / PaaS / Docker

### Любой VPS (systemd)

```ini
# /etc/systemd/system/infinews-bot.service
[Unit]
Description=InfiNews MAX Bot
After=network.target

[Service]
Type=simple
User=infinews
WorkingDirectory=/opt/infinews/max-bot
EnvironmentFile=/opt/infinews/max-bot/.env
ExecStart=/usr/bin/node bot.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now infinews-bot
sudo journalctl -u infinews-bot -f
```

### PM2

```bash
cd max-bot
npm i -g pm2
pm2 start bot.js --name infinews-bot
pm2 startup
pm2 save
pm2 logs infinews-bot
```

### Docker (только веб-приложение)

```bash
docker compose up -d            # prod-профиль, раздаёт dist/
docker compose --profile dev up # Vite + HMR на :5173
```

### Docker (бот)

Создайте `max-bot/Dockerfile`:

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
docker build -t infinews-bot .
docker run -d --name infinews --env-file .env --restart unless-stopped infinews-bot
```

## 🆘 Траблшутинг

| Симптом | Причина / Что делать |
|---|---|
| Бот не запускается: `❌ BOT_TOKEN is missing` | В `max-bot/.env` нет `BOT_TOKEN=...` или файл не подхватился. Проверьте, что `cp .env.example .env` сделан и вы **в директории `max-bot/`**. |
| `/start` работает, а `/admin` — «только для админов» | Добавьте ваш User ID (из `/myid`) в `ADMIN_IDS=` и перезапустите бота. |
| Все новости — дубликаты, ничего не приходит | Уже всё показано. Сбросьте: `/reset_dedup` (админ) или удалите `data/seen.json`. |
| `GigaChat summarize failed: GigaChat OAuth 401` | Неверные креды. Перевыпустите `CLIENT_ID` / `CLIENT_SECRET` на developers.sber.ru. |
| `GigaChat OAuth 403` | Скорее всего, scope `GIGACHAT_API_CORP`, а у вас физ. лицо. Поставьте `GIGACHAT_SCOPE=GIGACHAT_API_PERS`. |
| RSS-фид падает с 403/451 | У сайта включён блок по User-Agent/гео. Поменяйте `RSS_USER_AGENT` или удалите проблемный URL из `RSS_SOURCES`. |
| Бот подключается, но событий не видит | В [dev.max.ru](https://dev.max.ru) → карточка бота webhook должен быть **пуст** (для long-polling). |
| `node --check` ругается на ESM-импорты | Убедитесь, что в `max-bot/package.json` есть `"type": "module"`. |
| `/ask` пишет «GigaChat не включён» | `GIGACHAT_ENABLED=1` + корректные креды в `.env` + перезапуск бота. |
| После `git pull` сломалось | Скорее всего, изменился `config.js`. Сверьте свой `.env` с новым `.env.example`. |
| `Error: Cannot find module '@maxhub/max-bot-api'` | `npm install` не выполнен или выполнен не в той папке. Зайдите в `max-bot/` и снова `npm install`. |
| `Port 3001 already in use` | Порт занят. Поменяйте `WEBHOOK_PORT=3002` (или отключите webhook). |

## 👨‍💻 Разработка

- `npm run dev` в `max-bot/` — автоперезагрузка через `nodemon`.
- `LOG_EVENTS=0` — выключить лог входящих событий (когда шумно).
- `npm run debug` — Node Inspector на порту 9229 (подключайтесь через Chrome DevTools / VS Code).
- `data/seen.json` — добавьте в `.gitignore` (уже там), чтобы не коммитить локальный кэш дедупа.
- Тесты: пока нет. Можно добавить `vitest` для сервисов (`rssService`, `dedupService`).
- Добавить новую категорию: одна правка в `config.js` (`RSS_SOURCES`) + одна строка в `setMyCommands` в `bot.js` (по желанию).

## 📝 Лицензия

MIT
