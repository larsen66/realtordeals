import { Router } from "express";
import { randomUUID } from "node:crypto";
import { CardValidationError, cardTasks, createTaskSchema } from "@rieltordeals/domain";
import { parseCardFilters, parseCardPatch, parseNewCard } from "../cards/input.js";
import { getCardStore } from "../cards/store.js";

export const cardsRouter = Router();

cardsRouter.param("id", (_req, _res, next, id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    next(new CardValidationError("Некорректный идентификатор карточки", [
      { path: "id", message: "Укажите UUID карточки" },
    ]));
    return;
  }
  next();
});

cardsRouter.get("/", async (req, res) => {
  const filters = parseCardFilters({
    role: req.query.role,
    temperature: req.query.temperature,
    stage: req.query.stage,
  });
  const cards = await getCardStore().list(filters);
  res.json({ cards });
});

cardsRouter.get("/:id", async (req, res) => {
  const card = await getCardStore().getById(req.params.id);
  if (!card) {
    res.status(404).json({ error: "card not found" });
    return;
  }
  res.json({ card });
});

cardsRouter.post("/", async (req, res) => {
  const input = parseNewCard(req.body);
  const card = await getCardStore().insert(input);
  res.status(201).json({ card });
});

cardsRouter.patch("/:id", async (req, res) => {
  const store = getCardStore();
  const current = await store.getById(req.params.id);
  if (!current) {
    res.status(404).json({ error: "card not found" });
    return;
  }

  const patch = parseCardPatch(req.body, {
    role: current.role,
    stage: current.stage,
    selectionStatus: current.selectionStatus,
    referralStatus: current.referralStatus,
  });
  if (patch.fields) {
    // Form edits must preserve tasks managed through the task endpoints.
    patch.fields = { ...current.fields, ...patch.fields, tasks: cardTasks(current.fields) };
  }
  const card = await store.update(req.params.id, patch, current.updatedAt);
  if (!card) {
    res.status(409).json({ error: "Карточка изменилась. Обновите страницу и повторите действие." });
    return;
  }
  res.json({ card });
});

cardsRouter.post("/:id/tasks", async (req, res) => {
  const store = getCardStore();
  const current = await store.getById(req.params.id);
  if (!current) {
    res.status(404).json({ error: "card not found" });
    return;
  }
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new CardValidationError("Укажите тип, название и корректный срок задачи");
  }
  if (current.role === "seller" && ["mortgage", "selection", "viewing"].includes(parsed.data.type)) {
    throw new CardValidationError("Эта задача доступна только для покупателя");
  }
  const task = { ...parsed.data, id: randomUUID(), completedAt: null };
  const card = await store.update(current.id, {
    fields: { ...current.fields, tasks: [...cardTasks(current.fields), task] },
  }, current.updatedAt);
  if (!card) {
    res.status(409).json({ error: "Карточка изменилась. Повторите создание задачи." });
    return;
  }
  res.status(201).json({ card });
});

cardsRouter.post("/:id/promised-call/complete", async (req, res) => {
  const store = getCardStore();
  const current = await store.getById(req.params.id);
  if (!current) {
    res.status(404).json({ error: "card not found" });
    return;
  }
  if (!current.promisedCallAt || req.body?.expectedDueAt !== current.promisedCallAt) {
    res.status(409).json({ error: "Срок звонка изменился. Обновите страницу перед выполнением." });
    return;
  }
  const card = await store.update(current.id, { promisedCallAt: null }, current.updatedAt);
  if (!card) {
    res.status(409).json({ error: "Карточка изменилась. Обновите страницу и повторите действие." });
    return;
  }
  res.json({ card });
});

cardsRouter.patch("/:id/tasks/:taskId", async (req, res) => {
  const store = getCardStore();
  const current = await store.getById(req.params.id);
  if (!current) {
    res.status(404).json({ error: "card not found" });
    return;
  }
  const completed: unknown = req.body?.completed;
  const dueAt: unknown = req.body?.dueAt;
  if (completed === undefined && dueAt === undefined) {
    throw new CardValidationError("Укажите срок или статус выполнения задачи");
  }
  if (completed !== undefined && typeof completed !== "boolean") {
    throw new CardValidationError("Укажите, выполнена ли задача");
  }
  const parsedDueAt = dueAt === undefined ? undefined : createTaskSchema.shape.dueAt.safeParse(dueAt);
  if (parsedDueAt && !parsedDueAt.success) {
    throw new CardValidationError("Укажите корректный срок задачи");
  }
  const tasks = cardTasks(current.fields);
  if (!tasks.some((task) => task.id === req.params.taskId)) {
    res.status(404).json({ error: "task not found" });
    return;
  }
  const updated = tasks.map((task) => task.id === req.params.taskId
    ? {
      ...task,
      ...(parsedDueAt?.success ? { dueAt: parsedDueAt.data } : {}),
      ...(completed === undefined ? {} : {
        completedAt: completed ? task.completedAt ?? new Date().toISOString() : null,
      }),
    }
    : task);
  const card = await store.update(current.id, { fields: { ...current.fields, tasks: updated } }, current.updatedAt);
  if (!card) {
    res.status(409).json({ error: "Карточка изменилась. Повторите действие." });
    return;
  }
  res.json({ card });
});
