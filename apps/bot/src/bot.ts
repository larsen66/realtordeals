import { setTimeout as delay } from "node:timers/promises";
import { Bot, type Context } from "grammy";
import type { BotConfig } from "./config.js";
import { GatewayError, type Actor, type CrmGateway, type Draft, type Role } from "./contract.js";
import { renderDraft, reviewKeyboard, roleKeyboard } from "./presentation.js";

const actorOf = (ctx: Context): Actor => ({ telegramUserId: ctx.from!.id, chatId: ctx.chat!.id });
const failureText = (error: unknown) => error instanceof GatewayError && error.code === "conflict"
  ? "Черновик изменился. Откройте /draft и проверьте актуальные поля перед подтверждением."
  : error instanceof GatewayError && error.code === "forbidden"
    ? "API не разрешил доступ. Проверьте настройки доступа с Давидом."
    : "Не удалось получить подтверждение от CRM. Не считаю данные сохраненными. Проверьте /draft перед повторной отправкой.";

export function createBot(config: BotConfig, gateway: CrmGateway) {
  const bot = new Bot(config.token);
  // Only UI refresh subscriptions live here, never CRM state or reminder jobs.
  const watches = new Map<number, AbortController>();
  const stopWatch = (chatId: number) => { watches.get(chatId)?.abort(); watches.delete(chatId); };

  async function sendReview(actor: Actor, draft: Draft) {
    const chunks = renderDraft(draft, gateway.mode === "demo");
    for (let i = 0; i < chunks.length; i++) {
      await bot.api.sendMessage(actor.chatId, chunks[i]!, {
        ...(i === chunks.length - 1 ? { reply_markup: reviewKeyboard(draft) } : {}),
      });
    }
  }

  function watch(actor: Actor, draft: Draft) {
    stopWatch(actor.chatId);
    if (draft.status !== "processing") return;
    const abort = new AbortController();
    watches.set(actor.chatId, abort);
    void (async () => {
      try {
        for (let i = 0; i < 30; i++) {
          await delay(2000, undefined, { signal: abort.signal, ref: false });
          const latest = await gateway.get(actor, draft.id);
          if (abort.signal.aborted) return;
          if (latest.status !== "processing") {
            await sendReview(actor, latest);
            return;
          }
        }
        if (!abort.signal.aborted) await bot.api.sendMessage(actor.chatId,
          "Обработка еще идет. Результат и сохраненный черновик можно получить командой /draft.");
      } catch {
        // Backend keeps source/job state. /draft can resume after a restart or outage.
        if (!abort.signal.aborted) {
          await bot.api.sendMessage(actor.chatId, "Не удалось обновить результат. Проверьте /draft.").catch(() => undefined);
        }
      } finally {
        if (watches.get(actor.chatId) === abort) watches.delete(actor.chatId);
      }
    })();
  }

  async function show(actor: Actor, draft: Draft) {
    await sendReview(actor, draft);
    watch(actor, draft);
  }

  bot.use(async (ctx, next) => {
    if (!ctx.from || !config.allowedUserIds.has(ctx.from.id) || ctx.chat?.type !== "private") {
      if (ctx.callbackQuery) await ctx.answerCallbackQuery({ text: "Нет доступа" });
      else if (ctx.chat?.type === "private") await ctx.reply("Бот доступен только разрешенному менеджеру.");
      return;
    }
    try { await next(); }
    catch (error) { await ctx.reply(failureText(error)); }
  });

  bot.command(["start", "help"], async (ctx) => {
    await ctx.reply((gateway.mode === "demo" ? "ДЕМО: OpenAI и CRM не подключены.\n" : "") +
      "После выбора роли отправьте текст или голос. Я покажу поля для проверки. Запись — только по кнопке «Всё верно».\n" +
      "/new — новая заявка\n/draft — текущий черновик\n" +
      (gateway.mode === "demo" ? "Для демо вводите строки «Имя: …», «Телефон: …», «Бюджет: …» или «Цена: …». Голос пока не распознается." : ""),
      { reply_markup: roleKeyboard() });
  });
  bot.command("new", (ctx) => ctx.reply("Выберите роль новой заявки. Предыдущий черновик остается в бэкенде.", { reply_markup: roleKeyboard() }));
  bot.command("draft", async (ctx) => {
    const actor = actorOf(ctx);
    const draft = await gateway.current(actor);
    if (draft) await show(actor, draft);
    else await ctx.reply("Нет текущего черновика. Выберите роль:", { reply_markup: roleKeyboard() });
  });
  bot.callbackQuery(/^new:(buyer|seller)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const actor = actorOf(ctx);
    // Stable across double taps of the same role menu; different menus create new drafts.
    const key = `new:${actor.chatId}:${ctx.callbackQuery.message!.message_id}:${ctx.match[1]}`;
    const draft = await gateway.create(actor, ctx.match[1] as Role, key);
    await show(actor, draft);
  });
  bot.callbackQuery(/^show:([A-Za-z0-9_-]{1,36})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await show(actorOf(ctx), await gateway.get(actorOf(ctx), ctx.match[1]!));
  });
  bot.callbackQuery(/^(ok|fix):([A-Za-z0-9_-]{1,36}):(\d{1,10})$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const actor = actorOf(ctx);
    const id = ctx.match[2]!;
    const revision = Number(ctx.match[3]);
    const draft = await gateway.get(actor, id);
    if (draft.status === "confirmed") { await show(actor, draft); return; }
    if (draft.revision !== revision) {
      await ctx.reply("Эта кнопка относится к старой версии. Проверьте обновленные поля.");
      await show(actor, draft); return;
    }
    if (ctx.match[1] === "fix") {
      const current = await gateway.current(actor);
      if (current?.id !== id) {
        await ctx.reply("Сейчас открыта другая заявка. /draft покажет, куда попадет следующее сообщение.");
        return;
      }
      await ctx.reply("Пришлите исправления текстом или голосом. После обработки я снова покажу поля.");
      return;
    }
    if (!draft.canConfirm || draft.status !== "ready") { await show(actor, draft); return; }
    const result = await gateway.confirm(actor, id, revision);
    if (result.status !== "confirmed" || !result.cardId) throw new GatewayError("invalid");
    await show(actor, result);
  });

  bot.on(["message:text", "message:voice"], async (ctx) => {
    if (ctx.message.text?.startsWith("/")) { await ctx.reply("Команды: /new, /draft, /help"); return; }
    const actor = actorOf(ctx);
    const draft = await gateway.current(actor);
    if (!draft || draft.status === "confirmed") {
      await ctx.reply("Сначала выберите роль, затем пришлите сообщение еще раз.", { reply_markup: roleKeyboard() });
      return;
    }
    const common = { messageId: ctx.message.message_id, updateId: ctx.update.update_id };
    const voice = ctx.message.voice;
    if (voice && ((voice.file_size ?? 0) > config.maxVoiceBytes || voice.duration > config.maxVoiceSeconds)) {
      await ctx.reply("Голосовое слишком большое или длинное. Разделите его на несколько коротких сообщений.");
      return;
    }
    const input = voice
      ? { ...common, kind: "voice" as const, fileId: voice.file_id, fileUniqueId: voice.file_unique_id,
          duration: voice.duration, size: voice.file_size ?? null, mimeType: voice.mime_type ?? "audio/ogg" }
      : { ...common, kind: "text" as const, text: ctx.message.text! };
    // API persists the source and queues STT/extraction. No OpenAI, DB or Redis in this handler.
    await show(actor, await gateway.submit(actor, draft.id, input));
  });
  bot.on("callback_query:data", (ctx) => ctx.answerCallbackQuery({ text: "Кнопка устарела. Откройте /draft." }));
  bot.on("message", (ctx) => ctx.reply("Сейчас принимаю текст и голосовые. Фото добавим следующим этапом."));
  return { bot, close: () => { for (const id of watches.keys()) stopWatch(id); } };
}
