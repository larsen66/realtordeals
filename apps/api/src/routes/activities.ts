import { Router } from "express";
import { CardValidationError, createActivitySchema, patchActivitySchema } from "@rieltordeals/domain";
import { getActivityStore, type ActivityPatch } from "../activities/store.js";

export const activitiesRouter = Router();
activitiesRouter.param("id", (_req, _res, next, id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    next(new CardValidationError("Некорректный идентификатор активности"));
    return;
  }
  next();
});
activitiesRouter.get("/", async (_req, res) => {
  res.json({ activities: await getActivityStore().list() });
});
activitiesRouter.post("/", async (req, res) => {
  const parsed = createActivitySchema.safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Укажите вид активности, корректные дату и время; комментарий — до 5000 символов.");
  res.status(201).json({ activity: await getActivityStore().insert(parsed.data) });
});
activitiesRouter.patch("/:id", async (req, res) => {
  const parsed = patchActivitySchema.safeParse(req.body);
  if (!parsed.success) throw new CardValidationError("Проверьте дату, статус выполнения и версию активности.");
  const store = getActivityStore();
  const current = await store.get(req.params.id);
  if (!current) { res.status(404).json({ error: "Активность не найдена" }); return; }
  const { completed, expectedUpdatedAt, ...patch } = parsed.data;
  const changes: ActivityPatch = { ...patch };
  if (completed !== undefined) changes.completedAt = completed ? current.completedAt ?? new Date().toISOString() : null;
  const activity = await store.update(current.id, changes, expectedUpdatedAt);
  if (!activity) { res.status(409).json({ error: "Активность изменилась. Обновите страницу и повторите действие." }); return; }
  res.json({ activity });
});
