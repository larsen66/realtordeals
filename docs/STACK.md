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
| База | Supabase Cloud (Postgres + Studio), локальный Supabase — опционально. Express: `@supabase/server` + `@supabase/supabase-js`; Next.js сессии: `@supabase/ssr`, без Drizzle |
| Файлы | диск на VPS, отдаёт `apps/api` `/files`. Отдельного object storage нет |
| Транскрибация | OpenRouter `POST /api/v1/audio/transcriptions`, модель `openai/whisper-large-v3-turbo`, `language=ru` |
| Извлечение полей | OpenRouter через `@openrouter/ai-sdk-provider` + Vercel AI SDK `generateObject` + Zod-схемы форм |
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

CRM: список `/crm` — миниатюра продавца или покупателя, полная карточка по клику. Веб и Telegram — два UI одной модели.

Топики в группе, рассылка, ссылка на Авито/Циан, фото без водяного знака — часть того же контура, не отдельный продукт.

## Внешние API

| Зачем | Что | Как звать |
| --- | --- | --- |
| Мессенджер менеджера | Telegram Bot API | grammY, webhook. В группе — `chat_id` + `thread_id` |
| Голос → текст | OpenRouter STT | `openai/whisper-large-v3-turbo`, `language=ru` |
| Fallback STT | OpenRouter STT | `openai/gpt-4o-mini-transcribe` |
| Разложение в форму | OpenRouter chat | `json_schema` structured output, дешёвая chat-модель |
| База и Studio | Supabase | таблицы карточек, `@supabase/supabase-js` |
| WhatsApp | Cloud API / WABA | в плане после Telegram: рассылка и ответы в ту же карточку |

Один ключ: `OPENROUTER_API_KEY`. Отдельных ключей Groq и OpenAI нет.

STT: словарь (улицы, ЖК, «маткапитал», «занижение») передавать в `provider.options.groq.prompt`. На `/audio/transcriptions` нельзя задать `provider.order` / `only` — провайдера выбирает OpenRouter.

Извлечение полей: модель с `structured_outputs`, в роутинге `require_parameters: true`.

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

## Способы оплаты карточки

API возвращает `payment` как список: `cash`, `mortgage`, `installment`. При создании и обновлении можно передать несколько значений; `[]` или `null` очищают выбор. Старый запрос с одиночной строкой тоже поддерживается.

Полный список сохраняется в `cards.fields.paymentMethods` и проверяется схемой `packages/domain`. Старая колонка `cards.payment` остаётся совместимой с исходным ограничением базы: содержит первый из `cash`/`mortgage` либо `null`. При чтении приоритет у `fields.paymentMethods` (включая пустой список); если поля нет, одиночное старое значение превращается в список. Миграция облачной базы для этого изменения не требуется. Фильтр оплаты ищет вхождение выбранного способа в список.