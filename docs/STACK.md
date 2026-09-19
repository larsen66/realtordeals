# Стек

Продукт: операционный контур агентства из [BRIEF.md](../BRIEF.md).
Это выбранный стек, не каталог опций.
Менять только явным решением.

## Что используем

| Слой | Решение |
| --- | --- |
| Язык | TypeScript, pnpm-монорепо |
| Фронт | Next.js App Router + shadcn: лендинг, CRM, карточки |
| Бек | Express (`apps/api`): карточки, заявки, статусы, файлы |
| Telegram | grammY + `@grammyjs/conversations` |
| Очередь и фоновые задачи | Redis (`apps/worker`): STT, разложение в форму, напоминания, рассылка, фото, парсинг ссылки |
| База | Supabase (Postgres + Studio). Клиент `@supabase/supabase-js`, без Drizzle |
| Файлы | S3-совместимое хранилище (Timeweb S3) |
| Транскрибация | Groq `whisper-large-v3-turbo`, `language=ru` |
| Извлечение полей | OpenAI structured output через Vercel AI SDK `generateObject` + Zod-схемы форм |
| Хостинг | один VPS Timeweb Cloud, Москва, Docker Compose |
| Мессенджеры | Telegram Bot API. WhatsApp Cloud API / WABA — в плане, после Telegram. Других мессенджерных API нет |

## Что делаем

```
голос / текст / фото / ссылка          лендинг / CRM (Next.js + shadcn)
        ↓                                          ↓
   apps/bot (grammY)                         apps/api (Express)
        ↓                                          ↓
              Redis-очередь (apps/worker)
     STT · поля · напоминания · фото · рассылка
                       ↓
              карточка в Supabase
```

Бот принимает голос, текст, фото и ссылку, раскладывает в форму продавца или покупателя, сверяет обязательные поля, показывает черновик, после подтверждения пишет карточку.

Лендинг: форма заявки пишет ту же карточку покупателя.

CRM: карточки, статусы, подборки, просмотры. Веб и Telegram — два UI одной модели.

Топики в группе, рассылка, ссылка на Авито/Циан, фото без водяного знака — часть того же контура, не отдельный продукт.

## Внешние API

| Зачем | Что | Как звать |
| --- | --- | --- |
| Мессенджер менеджера | Telegram Bot API | grammY, webhook. В группе — `chat_id` + `thread_id` |
| Голос → текст | Groq Speech to Text | `whisper-large-v3-turbo` |
| Fallback STT | OpenAI | `gpt-4o-mini-transcribe` |
| Разложение в форму | OpenAI | structured output, дешёвая chat-модель |
| База и Studio | Supabase | таблицы карточек, `@supabase/supabase-js` |
| Фото карточки | S3 | загрузка и выгрузка с площадки |
| WhatsApp | Cloud API / WABA | в плане после Telegram: рассылка и ответы в ту же карточку |

STT: в промпт Groq передавать словарь (улицы, ЖК, «маткапитал», «занижение»).

## Репозиторий

```
apps/web          Next.js + shadcn: лендинг, CRM, карточки
apps/api          Express: карточки, заявки, статусы, файлы
apps/bot          grammY, webhook, conversations
apps/worker       Redis: STT, поля, напоминания, рассылка, фото
packages/domain   формы продавца/покупателя, статусы, правила обязательных полей
```

Пока кода нет — не плодить пустые пакеты.
Первый код: `packages/domain` (схемы форм), затем `apps/bot` и `apps/api`.
