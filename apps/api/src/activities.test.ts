import assert from "node:assert/strict";
import { after, test } from "node:test";
import type { AddressInfo } from "node:net";
import { activityCounts, activityMonth, type Activity } from "@rieltordeals/domain";
import { app } from "./app.js";
import { setActivityStore } from "./activities/store.js";
import { createMemoryActivityStore } from "./activities/memory-store.js";
import { setCardStore } from "./cards/store.js";
import { createMemoryStore } from "./cards/memory-store.js";

setActivityStore(createMemoryActivityStore());
setCardStore(createMemoryStore());
process.env.CRM_API_TOKEN = "test-crm-api-token";
const server = app.listen(0);
await new Promise<void>(resolve => server.once("listening", resolve));
after(() => server.close());
async function request(path: string, method = "GET", input?: unknown) {
  const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}${path}`, {
    method, headers: { "content-type": "application/json", authorization: "Bearer test-crm-api-token" }, body: input === undefined ? undefined : JSON.stringify(input),
  });
  return { status: response.status, body: await response.json() };
}
const input = { type: "flyers", scheduledAt: "2026-10-01T10:30:00+03:00", notes: "У метро" };

test("activities can be planned, rescheduled, completed once and returned to the plan", async () => {
  const created = await request("/activities", "POST", input);
  assert.equal(created.status, 201);
  let activity = created.body.activity;
  const id = activity.id;
  assert.equal(activity.completedAt, null);
  assert.ok((await request("/activities")).body.activities.some((a: Activity) => a.id === id));
  async function patch(changes: object) {
    const result = await request(`/activities/${id}`, "PATCH", { ...changes, expectedUpdatedAt: activity.updatedAt });
    assert.equal(result.status, 200);
    activity = result.body.activity;
  }
  await patch({ scheduledAt: "2026-10-02T12:00:00Z", notes: "Другой район" });
  assert.equal(activity.scheduledAt, "2026-10-02T12:00:00Z");
  await patch({ completed: true });
  const completedAt = activity.completedAt;
  assert.ok(completedAt);
  assert.equal(activity.notes, "Другой район");
  await patch({ completed: true });
  assert.equal(activity.completedAt, completedAt);
  await patch({ notes: "Выполнено у метро" });
  assert.equal(activity.completedAt, completedAt);
  assert.equal(activityCounts([activity]).flyers, 1);
  await patch({ completed: false });
  assert.equal(activity.completedAt, null);
  assert.equal(activityCounts([activity]).flyers, 0);
});

test("invalid activity inputs and stale writes cannot alter saved data", async () => {
  for (const changes of [ { type: "unknown" }, { scheduledAt: "tomorrow" }, { scheduledAt: "2026-02-30T12:00:00Z" },
    { scheduledAt: "2026-09-20T12:00:00" }, { notes: "x".repeat(5001) }, { completedAt: "2026-09-20T00:00:00Z" } ]) {
    assert.equal((await request("/activities", "POST", { ...input, ...changes })).status, 400);
  }
  const activity = (await request("/activities", "POST", input)).body.activity;
  for (const changes of [ {}, { completed: "true" }, { scheduledAt: null }, { type: "telegram" }, { completedAt: "2026-09-20T00:00:00Z" } ]) {
    assert.equal((await request(`/activities/${activity.id}`, "PATCH", { expectedUpdatedAt: activity.updatedAt, ...changes })).status, 400);
  }
  assert.equal((await request(`/activities/${activity.id}`, "PATCH", { notes: "Первое изменение", expectedUpdatedAt: activity.updatedAt })).status, 200);
  assert.equal((await request(`/activities/${activity.id}`, "PATCH", { notes: "Устаревшее изменение", expectedUpdatedAt: activity.updatedAt })).status, 409);
  const saved = (await request("/activities")).body.activities.find((a: Activity) => a.id === activity.id);
  assert.equal(saved.notes, "Первое изменение");
  assert.equal((await request("/activities/not-a-uuid", "PATCH", {})).status, 400);
  assert.equal((await request("/activities/00000000-0000-4000-8000-000000000001", "PATCH", { completed: true, expectedUpdatedAt: activity.updatedAt })).status, 404);
});

test("monthly counts follow completion dates and Moscow month boundaries across all activity types", () => {
  assert.equal(activityMonth("2026-09-30T20:59:59Z"), "2026-09");
  assert.equal(activityMonth("2026-09-30T21:00:00Z"), "2026-10");
  assert.equal(activityMonth("2026-12-31T21:00:00Z"), "2027-01");
  const base: Activity = { ...input, type: "flyers", id: "test", completedAt: null, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" };
  const rows: Activity[] = [base,
    { ...base, completedAt: "2026-09-30T20:59:59Z" },
    { ...base, type: "telegram", completedAt: "2026-09-30T21:00:00Z" },
    { ...base, type: "promo_stand", completedAt: "2026-10-20T09:00:00Z" },
  ];
  assert.deepEqual(activityCounts(rows, new Date("2026-09-20T10:00:00Z")), { flyers: 1, telegram: 0, promo_stand: 0 });
  assert.deepEqual(activityCounts(rows, new Date("2026-10-20T10:00:00Z")), { flyers: 0, telegram: 1, promo_stand: 1 });
});

test("referrals are created from scratch, filtered, and comments can be edited or cleared while tasks and other fields survive", async () => {
  const input = { role: "buyer", dealType: "purchase", stage: "referral", phone: "+79990001234", name: "Реферал", fields: { referralComment: "Первый комментарий", purchaseWhat: "Дом" } };
  const created = await request("/cards", "POST", input);
  assert.equal(created.status, 201);
  const card = created.body.card;
  assert.equal(card.stage, "referral");
  assert.equal(card.selectionStatus, null);
  assert.equal(card.referralStatus, "not_posted");
  await request(`/cards/${card.id}/tasks`, "POST", { type: "call", title: "Позвонить рефералу" });
  for (const comment of ["Обновлённый комментарий\nДоговорились созвониться", ""]) {
    assert.equal((await request(`/cards/${card.id}`, "PATCH", { fields: { referralComment: comment } })).status, 200);
    const saved = (await request(`/cards/${card.id}`)).body.card;
    assert.equal(saved.fields.referralComment, comment);
    assert.equal(saved.fields.purchaseWhat, "Дом");
    assert.equal(saved.fields.tasks.length, 1);
  }
  const referrals = (await request("/cards?role=buyer&stage=referral")).body.cards;
  assert.ok(referrals.some((item: { id: string }) => item.id === card.id));
  assert.equal((await request("/cards", "POST", { ...input, phone: "" })).status, 400);
  assert.equal((await request(`/cards/${card.id}`, "PATCH", { fields: { referralComment: "x".repeat(5001) } })).status, 400);
});
