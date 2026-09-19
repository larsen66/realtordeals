import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { CardValidationError } from "@rieltordeals/domain";
import { parseNewCard } from "../cards/input.js";
import { getCardStore } from "../cards/store.js";

export const botRouter = Router();

const roleSchema = z.enum(["buyer", "seller"]);
const optionalText = z.string().nullable();
const fieldValue = z.union([z.string(), z.boolean()]);
const candidateSchema = z.object({
  name: optionalText, phone: optionalText, objectType: optionalText, address: optionalText,
  source: optionalText, budget: optionalText,
  temperature: z.enum(["cold", "warm", "hot"]).nullable(),
  payment: z.enum(["cash", "mortgage"]).nullable(),
  promisedCallAt: z.string().datetime({ offset: true }).nullable(),
  fields: z.record(z.string(), fieldValue), notes: z.array(z.string()),
});
type Candidate = z.infer<typeof candidateSchema>;

const messageSchema = z.object({
  kind: z.literal("text"), text: z.string().min(1).max(100_000), messageId: z.number().int().positive(),
  updateId: z.number().int().nonnegative(), extraction: candidateSchema,
});

type Draft = {
  id: string; revision: number; role: z.infer<typeof roleSchema>; status: "collecting" | "needs_input" | "ready" | "confirmed";
  candidate: Candidate; sourceTexts: string[]; processedUpdates: Set<number>; cardId: string | null;
};
const drafts = new Map<string, Draft>();
const activeDrafts = new Map<string, string>();
const createRequests = new Map<string, string>();
const emptyCandidate = (): Candidate => ({
  name: null, phone: null, objectType: null, address: null, source: "telegram", budget: null,
  temperature: null, payment: null, promisedCallAt: null, fields: {}, notes: [],
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

function actor(req: { header(name: string): string | undefined }) {
  const user = req.header("x-telegram-user-id"); const chat = req.header("x-telegram-chat-id");
  if (!user || !chat || !/^\d+$/.test(user) || !/^-?\d+$/.test(chat)) throw new CardValidationError("Некорректный контекст Telegram");
  return `${user}:${chat}`;
}
function checkToken(req: { header(name: string): string | undefined }) {
  const token = process.env.BOT_API_TOKEN;
  if (!token || req.header("authorization") !== `Bearer ${token}`) return false;
  return true;
}
function merge(old: Candidate, next: Candidate): Candidate {
  const top = Object.fromEntries(Object.entries(next).map(([key, value]) => [key,
    key === "fields" || key === "notes" ? value : value ?? old[key as keyof Candidate],
  ])) as Candidate;
  return {
    ...top,
    fields: { ...old.fields, ...next.fields },
    notes: [...old.notes, ...next.notes].filter((note, index, all) => all.indexOf(note) === index).slice(-50),
  };
}
function view(draft: Draft) {
  const candidate = draft.candidate;
  const values: [string, string | boolean | null][] = [
    ["name", candidate.name], ["phone", candidate.phone], ["objectType", candidate.objectType],
    ["address", candidate.address], ["budget", candidate.budget], ...Object.entries(candidate.fields),
  ];
  const issues = candidate.phone?.trim() ? [] : ["Телефон: продиктуйте или напишите номер для сохранения карточки"];
  const status = draft.status === "confirmed" ? "confirmed" : issues.length ? "needs_input" : "ready";
  return {
    id: draft.id, revision: draft.revision, role: draft.role, status,
    fields: values.map(([key, value]) => ({ key, label: labels[key] ?? key, value: value === null || value === undefined ? null : String(value) })),
    issues, notes: candidate.notes, canConfirm: status === "ready", cardId: draft.cardId,
  };
}

botRouter.use((req, res, next) => {
  if (!checkToken(req)) { res.status(401).json({ error: "bot access denied" }); return; }
  next();
});

botRouter.get("/drafts/current", (req, res) => {
  const id = activeDrafts.get(actor(req));
  res.json(id ? view(drafts.get(id)!) : null);
});

botRouter.post("/drafts", (req, res) => {
  const parsed = z.object({ role: roleSchema }).safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Укажите роль карточки");
  const owner = actor(req); const requestId = req.header("idempotency-key");
  if (!requestId) throw new CardValidationError("Нужен идентификатор запроса");
  const requestKey = `${owner}:${requestId}`; const existingId = createRequests.get(requestKey);
  if (existingId) { res.json(view(drafts.get(existingId)!)); return; }
  const draft: Draft = { id: randomUUID(), revision: 0, role: parsed.data.role, status: "collecting",
    candidate: emptyCandidate(), sourceTexts: [], processedUpdates: new Set(), cardId: null };
  drafts.set(draft.id, draft); activeDrafts.set(owner, draft.id); createRequests.set(requestKey, draft.id);
  res.status(201).json(view(draft));
});

botRouter.get("/drafts/:id", (req, res) => {
  const draft = drafts.get(req.params.id);
  if (!draft || activeDrafts.get(actor(req)) !== draft.id) { res.status(404).json({ error: "draft not found" }); return; }
  res.json(view(draft));
});

botRouter.post("/drafts/:id/messages", (req, res) => {
  const draft = drafts.get(req.params.id);
  if (!draft || activeDrafts.get(actor(req)) !== draft.id) { res.status(404).json({ error: "draft not found" }); return; }
  if (draft.status === "confirmed") { res.status(409).json({ error: "draft already confirmed" }); return; }
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Некорректный результат обработки сообщения");
  if (!draft.processedUpdates.has(parsed.data.updateId)) {
    draft.processedUpdates.add(parsed.data.updateId);
    draft.candidate = merge(draft.candidate, parsed.data.extraction);
    draft.sourceTexts.push(parsed.data.text);
    draft.revision++;
  }
  res.json(view(draft));
});

botRouter.post("/drafts/:id/confirm", async (req, res) => {
  const draft = drafts.get(req.params.id);
  if (!draft || activeDrafts.get(actor(req)) !== draft.id) { res.status(404).json({ error: "draft not found" }); return; }
  const parsed = z.object({ revision: z.number().int().nonnegative(), confirmed: z.literal(true) }).safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Некорректное подтверждение");
  if (draft.status === "confirmed") { res.json(view(draft)); return; }
  if (draft.revision !== parsed.data.revision) { res.status(409).json({ error: "draft changed" }); return; }
  const draftView = view(draft);
  if (!draftView.canConfirm) { res.status(422).json(draftView); return; }
  const candidate = draft.candidate;
  const card = await getCardStore().insert(parseNewCard({
    role: draft.role, dealType: draft.role === "buyer" ? "purchase" : "sale", phone: candidate.phone,
    name: candidate.name, objectType: candidate.objectType, address: candidate.address, source: candidate.source,
    budget: candidate.budget, temperature: candidate.temperature, payment: candidate.payment,
    promisedCallAt: candidate.promisedCallAt, fields: candidate.fields, sourceText: draft.sourceTexts.join("\n\n"),
  }));
  draft.cardId = card.id; draft.status = "confirmed";
  res.json(view(draft));
});
