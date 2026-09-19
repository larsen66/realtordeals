# rieltordeals

Операционный контур агентства недвижимости: лид → квалификация → фиксация в боте → карточка в CRM.

- Продукт: [BRIEF.md](BRIEF.md)
- Стек: [docs/STACK.md](docs/STACK.md)
- Правила агента: [AGENTS.md](AGENTS.md)
- Срез CRM/API/БД: [docs/plans/crm-api-db-slice.md](docs/plans/crm-api-db-slice.md)

## Запуск

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
