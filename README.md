# rieltordeals

Операционный контур агентства недвижимости: лид → квалификация → фиксация в боте → карточка в CRM.

- Продукт: [BRIEF.md](BRIEF.md)
- Стек: [docs/STACK.md](docs/STACK.md)
- Правила агента: [AGENTS.md](AGENTS.md)
- Срез CRM/API/БД: [docs/plans/crm-api-db-slice.md](docs/plans/crm-api-db-slice.md)

## Облачный Supabase

Локальный Docker для этого режима не нужен. Используйте pnpm 10.33.0 из `packageManager`.

1. Выполните `pnpm install`.
2. Скопируйте `.env.example` в `.env` в корне репозитория. Укажите `SUPABASE_URL` своего проекта и полный `SUPABASE_SECRET_KEY` из Supabase → Settings → API Keys. Для старых проектов поддерживается `SUPABASE_SERVICE_ROLE_KEY`. Значение со скрытыми символами `••••` не подходит.
3. Скопируйте `apps/web/.env.example` в `apps/web/.env.local`. Укажите `NEXT_PUBLIC_SUPABASE_URL` и `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` того же проекта. Серверный секрет в этот файл не добавляйте.
4. Для новой базы выполните в Supabase SQL Editor файлы `supabase/migrations/20260919120000_create_cards.sql`, затем `supabase/migrations/20260919140000_card_stage_statuses.sql`. Таблица `cards` сохраняет RLS; доступ к карточкам идёт через Express API. Повторно применённые миграции не запускайте. `supabase/seed.sql` содержит демонстрационные данные и для подключения не требуется.
5. Выполните `pnpm dev`. CRM: `http://localhost:3000/crm`, API: `http://localhost:3001/health`.

Next.js использует `src/utils/supabase/client.ts` и `server.ts`. В Server Component клиент создаётся через `await createClient()`. `src/proxy.ts` обновляет сессии через `getClaims()` и передаёт cookies и cache headers. Это инфраструктура сессий, а не экран входа или проверка доступа к Express API. Текущий API не проверяет пользователя; до публикации CRM в интернете нужно добавить авторизацию менеджеров.

Облачный Express-клиент создаётся через `@supabase/server/core`; старый service_role поддерживается через `@supabase/supabase-js`. `SUPABASE_PUBLISHABLE_KEY` и `SUPABASE_JWKS_URL` — серверные настройки SDK для проверки пользовательских токенов при добавлении авторизации. Все локальные `.env` исключены из Git.

## Локальный Supabase (Docker)

Нужен Docker. Локальный Supabase поднимает Postgres и Studio.

```bash
pnpm install
cp .env.example .env
supabase start
```

После `supabase start` скопируй `API URL` и `service_role` key в `.env`:

```
SUPABASE_URL=http://127.0.0.1:55421
SUPABASE_SERVICE_ROLE_KEY=...
```

Ключи Supabase только в API, не в `apps/web`.

```bash
pnpm dev
```

- web: `http://localhost:3000` — `apps/web` (лендинг `/`, CRM `/crm`)
- api: `http://localhost:3001` — `apps/api`, `GET /health`
- Studio: `http://127.0.0.1:55423`

Порты локального Supabase сдвинуты с дефолтных 54321+, чтобы не пересекаться с другим проектом на той же машине.

## Репозиторий

```
apps/web          Next.js App Router: лендинг, CRM, карточки
apps/api          Express: /health, /cards, /leads, /statuses, /files
apps/bot          grammY — следующий пакет
apps/worker       Redis — следующий пакет
packages/domain   схемы форм продавца и покупателя
supabase          локальный Postgres, миграции
```
