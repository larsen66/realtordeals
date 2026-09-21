# Vercel deployment

Проект разворачивается из одного Git-репозитория как три Vercel-проекта. Для каждого
проекта нужно включить доступ к файлам вне Root Directory: приложения импортируют
workspace-пакеты из этого же монорепозитория.

Для всех трёх проектов Production Branch: `main`. Все приложения и общие пакеты
хранятся в этой ветке; отдельная ветка для бота при деплое не нужна.

## API

- Root Directory: `apps/api`
- Framework Preset: Express
- Production Branch: основная ветка репозитория
- Environment Variables:
  - `SUPABASE_URL`
  - `SUPABASE_SECRET_KEY`
  - `CRM_API_TOKEN`
  - `BOT_API_TOKEN`
  - `USE_MEMORY_STORE=false`

После деплоя проверить `GET /health`. Маршруты `/cards`, `/statuses` и `/files`
принимают только `Authorization: Bearer <CRM_API_TOKEN>`. Маршруты `/bot/v1`
используют отдельный `BOT_API_TOKEN`.

## Web

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Production Branch: основная ветка репозитория
- Environment Variables:
  - `CRM_API_URL` — production URL API-проекта без завершающего `/`
  - `CRM_API_TOKEN` — то же значение, что в API-проекте
  - `CRM_WEB_USER`
  - `CRM_WEB_PASSWORD`

В браузере запросы CRM идут на `/api/crm/*`. Next.js Route Handler добавляет API-токен
на сервере, поэтому токен не попадает в клиентский JavaScript. В production путь
`/crm/*` и `/api/crm/*` закрыты HTTP Basic Authentication.

## Telegram bot

- Root Directory: `apps/bot`
- Framework Preset: Other
- Production Branch: основная ветка репозитория
- Environment Variables:
  - `BOT_MODE=api`
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_ALLOWED_USER_IDS` — Telegram ID через запятую
  - `TELEGRAM_WEBHOOK_SECRET` — случайная строка из букв, цифр, `_` и `-`
  - `CRM_API_URL` — production URL API-проекта без завершающего `/`
  - `CRM_API_TOKEN` — значение `BOT_API_TOKEN` из API-проекта
  - `OPENAI_API_KEY`
  - при необходимости `OPENAI_TEXT_MODEL`, `OPENAI_TRANSCRIPTION_MODEL`,
    `BOT_MAX_VOICE_BYTES`, `BOT_MAX_VOICE_SECONDS`

Webhook принимает только `POST /api/telegram` с заголовком
`X-Telegram-Bot-Api-Secret-Token`. Проверка состояния: `GET /api/health`.
Polling-файл `src/index.ts` остаётся для локального запуска и на Vercel не запускается.

## Порядок первого запуска

1. Применить миграции Supabase, включая `20260920110000_bot_drafts.sql` и `20260920150000_bot_edit_clients.sql`.
2. Создать и задеплоить API-проект, проверить `GET /health`.
3. Указать URL API и секреты в web-проекте, задеплоить Web и проверить `/crm`.
4. Создать и задеплоить Bot, проверить `GET /api/health`.
5. Только после успешной проверки зарегистрировать production URL
   `/api/telegram` через Telegram `setWebhook`, передав `secret_token`, равный
   `TELEGRAM_WEBHOOK_SECRET`.

Не включать `USE_MEMORY_STORE=true` в preview или production: данные такого
хранилища исчезают между экземплярами Vercel Function.

В облачном режиме события расхода OpenAI записываются в runtime-логи Vercel.
Новые события также сохраняются через API в таблице `bot_usage`. Команда `/usage` показывает
сумму токенов и оценку расходов; после подтверждения показывается расход черновика.
Меню команд регистрируется автоматически при инициализации бота.
