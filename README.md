# rieltordeals

Операционный контур агентства недвижимости: лид → квалификация → фиксация в боте → карточка в CRM.

- Продукт: [BRIEF.md](BRIEF.md)
- Стек: [docs/STACK.md](docs/STACK.md)
- Правила агента: [AGENTS.md](AGENTS.md)

## Запуск

```bash
pnpm install
pnpm dev
```

- web: `http://localhost:3000` — `apps/web` (лендинг `/`, CRM `/crm`)
- api: `http://localhost:3001` — `apps/api`, `GET /health`

## Репозиторий

```
apps/web          Next.js App Router: лендинг, CRM, карточки
apps/api          Express: /health, /cards, /leads, /statuses, /files
apps/bot          grammY — следующий пакет
apps/worker       Redis — следующий пакет
packages/domain   схемы форм — следующий пакет
```
