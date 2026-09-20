import { createSupabaseClient } from "../lib/supabase.js";
import { Router } from "express";
import { z } from "zod";
import { CardValidationError } from "@rieltordeals/domain";
import { candidateSchema, type Candidate, type DraftRecord } from "../bot/draft.js";
import { getDraftStore } from "../bot/store.js";
import { getCardStore } from "../cards/store.js";
import { parseNewCard } from "../cards/input.js";

export const botRouter = Router();

const roleSchema = z.enum(["buyer", "seller"]);
const messageSchema = z.object({
  kind: z.literal("text"),
  text: z.string().min(1).max(100_000),
  messageId: z.number().int().positive(),
  updateId: z.number().int().nonnegative(),
  extraction: candidateSchema,
});

const labels: Record<string, string> = {
  name: "Имя", phone: "Телефон", objectType: "Тип объекта", address: "Адрес", source: "Источник", budget: "Бюджет",
  price: "Цена", rooms: "Комнаты", area: "Площадь", floor: "Этаж", floors: "Этажность", mortgage: "Ипотека",
  arrests: "Аресты", ownersCount: "Собственники", saleGoal: "Цель продажи", saleSpeed: "Срок продажи",
  whatTheyLeave: "Что остается", childrenShares: "Детские доли", maternityCapital: "Маткапитал",
  priceUnderstatement: "Занижение", purchaseWhat: "Что покупает", purchaseMethod: "Способ покупки",
  location: "Локация", locationWhy: "Почему локация", layout: "Планировка", finish: "Отделка",
  purchaseGoal: "Цель покупки", viewedBefore: "Смотрели ранее", developersViewed: "Застройщики", whereViewed: "Где смотрели",
  listingUrl: "Ссылка на объявление", district: "Район", metro: "Метро", selectionNotes: "Заметки",
};

function ownerKey(req: { header(name: string): string | undefined }) {
  const user = req.header("x-telegram-user-id");
  const chat = req.header("x-telegram-chat-id");
  if (!user || !chat || !/^\d+$/.test(user) || !/^-?\d+$/.test(chat)) {
    throw new CardValidationError("Некорректный контекст Telegram");
  }
  return `${user}:${chat}`;
}

function checkToken(req: { header(name: string): string | undefined }) {
  const token = process.env.BOT_API_TOKEN;
  return Boolean(token && req.header("authorization") === `Bearer ${token}`);
}

function merge(old: Candidate, next: Candidate): Candidate {
  const top = Object.fromEntries(Object.entries(next).map(([key, value]) => [
    key,
    key === "fields" || key === "notes" ? value : value ?? old[key as keyof Candidate],
  ])) as Candidate;
  return {
    ...top,
    fields: { ...old.fields, ...next.fields },
    notes: [...old.notes, ...next.notes].filter((note, index, all) => all.indexOf(note) === index).slice(-50),
  };
}

function view(draft: DraftRecord) {
  const candidate = draft.candidate;
  const values: [string, string | boolean | null][] = [
    ["name", candidate.name], ["phone", candidate.phone], ["objectType", candidate.objectType],
    ["address", candidate.address], ["budget", candidate.budget], ...Object.entries(candidate.fields),
  ];
  const issues = candidate.phone?.trim() ? [] : ["Телефон: продиктуйте или напишите номер для сохранения карточки"];
  const status = draft.status === "confirmed" ? "confirmed" : issues.length ? "needs_input" : "ready";
  return {
    id: draft.id,
    revision: draft.revision,
    role: draft.role,
    status,
    fields: values.map(([key, value]) => ({
      key, label: labels[key] ?? key, value: value === null || value === undefined ? null : String(value),
    })),
    issues,
    notes: candidate.notes,
    canConfirm: status === "ready",
    cardId: draft.cardId,
    targetCardId: draft.targetCardId ?? null,
  };
}

botRouter.use((req, res, next) => {
  if (!checkToken(req)) {
    res.status(401).json({ error: "bot access denied" });
    return;
  }
  next();
});

const usageSchema = z.object({
  id: z.uuid(), keyId: z.string().regex(/^[a-f0-9]{16}$/), draftId: z.string().nullable(),
  totalTokens: z.number().nonnegative().nullable(), estimatedUsd: z.number().nonnegative().nullable(),
});
const usageMemory = new Map<string, z.infer<typeof usageSchema>>();
botRouter.post("/usage", async (req, res) => {
  const parsed = usageSchema.safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Некорректная запись расходов");
  const row = parsed.data;
  if (process.env.USE_MEMORY_STORE === "true") usageMemory.set(row.id, row);
  else {
    const { error } = await createSupabaseClient().from("bot_usage").upsert({
      id: row.id, key_id: row.keyId, draft_id: row.draftId,
      total_tokens: row.totalTokens, estimated_usd: row.estimatedUsd,
    }, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }
  res.json({ ok: true });
});
botRouter.post("/usage/report", async (req, res) => {
  const parsed = z.object({ keyId: z.string().regex(/^[a-f0-9]{16}$/), draftId: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Некорректный запрос расходов");
  const { keyId, draftId } = parsed.data;
  if (process.env.USE_MEMORY_STORE === "true") {
    const rows = [...usageMemory.values()].filter(row => row.keyId === keyId && (!draftId || row.draftId === draftId));
    res.json({ count: rows.length, tokens: rows.reduce((sum, row) => sum + (row.totalTokens ?? 0), 0),
      usd: rows.reduce((sum, row) => sum + (row.estimatedUsd ?? 0), 0),
      unknown: rows.filter(row => row.totalTokens === null || row.estimatedUsd === null).length });
  } else {
    const { data, error } = await createSupabaseClient().rpc("bot_usage_report", { p_key_id: keyId, p_draft_id: draftId ?? null });
    if (error) throw error;
    res.json(data);
  }
});

// Exact phone matching; keep the query out of URLs and request logs.
botRouter.post("/clients/search", async (req, res) => {
  ownerKey(req);
  const parsed = z.object({ phone: z.string().trim().min(1) }).safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Введите телефон");
  const phone = parsed.data.phone.replace(/\D/g, "");
  if (phone.length < 7) throw new CardValidationError("Введите полный телефон");
  const normalize = (value: string) => value.replace(/\D/g, "").replace(/^8(?=\d{10}$)/, "7");
  const cards = await getCardStore().list({});
  res.json(cards.filter(card => normalize(card.phone) === normalize(phone))
    .map(({ id, name, phone, role }) => ({ id, name, phone, role })));
});

botRouter.post("/clients/:id/edit", async (req, res) => {
  const parsed = z.uuid().safeParse(req.params.id);
  if (!parsed.success) throw new CardValidationError("Некорректный ID клиента");
  const id = parsed.data;
  const card = await getCardStore().getById(id);
  if (!card) { res.status(404).json({ error: "card not found" }); return; }
  const requestId = req.header("idempotency-key");
  if (!requestId || requestId.length > 200) throw new CardValidationError("Нужен идентификатор запроса");
  res.json(view(await getDraftStore().create(ownerKey(req), card.role, requestId, card)));
});

botRouter.get("/drafts/current", async (req, res) => {
  const draft = await getDraftStore().current(ownerKey(req));
  res.json(draft ? view(draft) : null);
});

botRouter.post("/drafts", async (req, res) => {
  const parsed = z.object({ role: roleSchema }).safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Укажите роль карточки");
  const requestId = req.header("idempotency-key");
  if (!requestId || requestId.length > 200) throw new CardValidationError("Нужен идентификатор запроса");
  const draft = await getDraftStore().create(ownerKey(req), parsed.data.role, requestId);
  res.status(draft.revision === 0 ? 201 : 200).json(view(draft));
});

botRouter.get("/drafts/:id", async (req, res) => {
  const draft = await getDraftStore().get(ownerKey(req), req.params.id);
  if (!draft) {
    res.status(404).json({ error: "draft not found" });
    return;
  }
  res.json(view(draft));
});

botRouter.post("/drafts/:id/messages", async (req, res) => {
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Некорректный результат обработки сообщения");
  const owner = ownerKey(req);
  const store = getDraftStore();

  for (let attempt = 0; attempt < 3; attempt++) {
    const draft = await store.get(owner, req.params.id);
    if (!draft) {
      res.status(404).json({ error: "draft not found" });
      return;
    }
    if (draft.status === "confirmed") {
      res.status(409).json({ error: "draft already confirmed" });
      return;
    }
    if (draft.processedUpdates.includes(parsed.data.updateId)) {
      res.json(view(draft));
      return;
    }
    const saved = await store.save({
      ...draft,
      candidate: merge(draft.candidate, parsed.data.extraction),
      sourceTexts: [...draft.sourceTexts, parsed.data.text],
      processedUpdates: [...draft.processedUpdates, parsed.data.updateId],
      revision: draft.revision + 1,
    }, draft.revision);
    if (saved) {
      res.json(view(saved));
      return;
    }
  }
  res.status(409).json({ error: "draft changed" });
});

botRouter.post("/drafts/:id/confirm", async (req, res) => {
  const parsed = z.object({ revision: z.number().int().nonnegative(), confirmed: z.literal(true) }).safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Некорректное подтверждение");
  const owner = ownerKey(req);
  const store = getDraftStore();
  const draft = await store.get(owner, req.params.id);
  if (!draft) {
    res.status(404).json({ error: "draft not found" });
    return;
  }
  if (draft.status !== "confirmed" && draft.revision !== parsed.data.revision) {
    res.status(409).json({ error: "draft changed" });
    return;
  }
  const draftView = view(draft);
  if (draft.status !== "confirmed" && !draftView.canConfirm) {
    res.status(422).json(draftView);
    return;
  }
  const candidate = draft.candidate;
  const original = draft.targetCardId ? await getCardStore().getById(draft.targetCardId) : null;
  if (draft.targetCardId && draft.status !== "confirmed" && (!original || original.updatedAt !== draft.targetUpdatedAt)) {
    res.status(409).json({ error: "card changed; reopen from CRM" }); return;
  }
  const card = parseNewCard({
    role: draft.role,
    dealType: draft.role === "buyer" ? "purchase" : "sale",
    phone: candidate.phone,
    name: candidate.name,
    objectType: candidate.objectType,
    address: candidate.address,
    source: candidate.source,
    budget: candidate.budget,
    temperature: candidate.temperature,
    payment: candidate.payment,
    promisedCallAt: candidate.promisedCallAt,
    fields: candidate.fields,
    sourceText: draft.sourceTexts.join("\n\n"),
  });
  const input = original ? { ...original, ...card, dealType: original.dealType,
    stage: original.stage, selectionStatus: original.selectionStatus, referralStatus: original.referralStatus,
    birthday: original.birthday, fields: { ...original.fields, ...card.fields },
    sourceText: [original.sourceText, card.sourceText].filter(Boolean).join("\n\n") || null } : card;
  const result = await store.confirm(owner, draft.id, parsed.data.revision, input);
  if (result.status === "not_found") {
    res.status(404).json({ error: "draft not found" });
    return;
  }
  if (result.status === "conflict") {
    res.status(409).json({ error: "draft changed" });
    return;
  }
  res.json(view(result.draft));
});
