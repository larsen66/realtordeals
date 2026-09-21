import { cardFromRow, cardToInsertRow } from "./cards/map.js";
import { parseNewCard } from "./cards/input.js";
import type { CardDto } from "./cards/types.js";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, test } from "node:test";
import { app } from "./app.js";
import { createMemoryStore } from "./cards/memory-store.js";
import { setCardStore } from "./cards/store.js";

setCardStore(createMemoryStore());
process.env.BOT_API_TOKEN = "test-bot-api-token";
process.env.CRM_API_TOKEN = "test-crm-api-token";
process.env.USE_MEMORY_STORE = "true";

const server = app.listen(0);
await new Promise<void>((resolve) => {
  server.once("listening", () => resolve());
});

function baseUrl() {
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

function crmFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("authorization", "Bearer test-crm-api-token");
  return fetch(`${baseUrl()}${path}`, { ...init, headers });
}

test("GET /health returns { ok: true }", async () => {
  const res = await fetch(`${baseUrl()}/health`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
});

test("protected CRM routes reject requests without the API token", async () => {
  assert.equal((await fetch(`${baseUrl()}/cards`)).status, 401);
  assert.equal((await fetch(`${baseUrl()}/statuses`)).status, 401);
});

test("POST /cards without phone returns 400", async () => {
  const res = await crmFetch("/cards", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ role: "buyer", dealType: "purchase" }),
  });
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.equal(typeof body.error, "string");
});

test("POST /cards creates a buyer card with default stage", async () => {
  const res = await crmFetch("/cards", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      role: "buyer",
      dealType: "purchase",
      phone: "+79990001122",
      name: "Анна",
    }),
  });
  assert.equal(res.status, 201);
  const body = (await res.json()) as {
    card: {
      phone: string;
      stage: string;
      selectionStatus: string | null;
      tags: string[];
    };
  };
  assert.equal(body.card.phone, "+79990001122");
  assert.equal(body.card.stage, "selection");
  assert.equal(body.card.selectionStatus, "waiting");
  assert.deepEqual(body.card.tags, ["Покупатель", "Покупка"]);
});

test("PATCH /cards moves a buyer to viewing and clears selection status", async () => {
  const created = await crmFetch("/cards", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      role: "buyer",
      dealType: "purchase",
      phone: "+79990003344",
    }),
  });
  const { card } = (await created.json()) as { card: { id: string } };

  const res = await crmFetch(`/cards/${card.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stage: "viewing" }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    card: { stage: string; selectionStatus: string | null };
  };
  assert.equal(body.card.stage, "viewing");
  assert.equal(body.card.selectionStatus, null);
});

test("GET /statuses returns temperatures and stages from domain", async () => {
  const res = await crmFetch("/statuses");
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    temperatures: { value: string }[];
    stages: { value: string }[];
    selectionStatuses: { value: string }[];
    referralStatuses: { value: string }[];
  };
  assert.deepEqual(
    body.temperatures.map((item) => item.value),
    ["cold", "warm", "hot"],
  );
  assert.deepEqual(
    body.stages.map((item) => item.value),
    ["selection", "viewing", "close", "deal", "referral"],
  );
  assert.deepEqual(
    body.selectionStatuses.map((item) => item.value),
    ["waiting", "awaiting_reply"],
  );
  assert.deepEqual(
    body.referralStatuses.map((item) => item.value),
    ["posted", "not_posted"],
  );
});

test("bot creates a draft, validates phone and saves exactly one CRM card after confirmation", async () => {
  const headers = {
    "content-type": "application/json", authorization: "Bearer test-bot-api-token",
    "x-telegram-user-id": "42", "x-telegram-chat-id": "42",
  };
  const created = await fetch(`${baseUrl()}/bot/v1/drafts`, {
    method: "POST", headers: { ...headers, "idempotency-key": "menu-1" },
    body: JSON.stringify({ role: "buyer" }),
  });
  assert.equal(created.status, 201);
  const draft = (await created.json()) as { id: string; revision: number; canConfirm: boolean };
  assert.equal(draft.canConfirm, false);
  const message = {
    kind: "text", text: "Учебный текст", messageId: 1, updateId: 1,
    extraction: { name: "Учебный клиент", phone: "+79990001234", objectType: null, address: null,
      source: "telegram", budget: "5 млн", temperature: null, payment: "cash", promisedCallAt: null,
      fields: { purchaseWhat: "Квартира", location: "Краснодар" }, notes: ["Учебные данные"] },
  };
  const updated = await fetch(`${baseUrl()}/bot/v1/drafts/${draft.id}/messages`, {
    method: "POST", headers, body: JSON.stringify(message),
  });
  assert.equal(updated.status, 200);
  const review = (await updated.json()) as { revision: number; canConfirm: boolean; fields: { key: string; value: string | null }[] };
  assert.equal(review.canConfirm, true);
  assert.equal(review.fields.find((field) => field.key === "purchaseWhat")?.value, "Квартира");
  const confirmed = await fetch(`${baseUrl()}/bot/v1/drafts/${draft.id}/confirm`, {
    method: "POST", headers, body: JSON.stringify({ revision: review.revision, confirmed: true }),
  });
  assert.equal(confirmed.status, 200);
  const saved = (await confirmed.json()) as { cardId: string; status: string };
  assert.equal(saved.status, "confirmed");
  assert.ok(saved.cardId);
  const repeated = await fetch(`${baseUrl()}/bot/v1/drafts/${draft.id}/confirm`, {
    method: "POST", headers, body: JSON.stringify({ revision: review.revision, confirmed: true }),
  });
  assert.equal((await repeated.json() as { cardId: string }).cardId, saved.cardId);
  const card = await crmFetch(`/cards/${saved.cardId}`);
  assert.equal(card.status, 200);
  assert.equal(((await card.json()) as { card: { fields: { purchaseWhat: string } } }).card.fields.purchaseWhat, "Квартира");
});

test("bot route rejects missing API token and stale confirmation", async () => {
  assert.equal((await fetch(`${baseUrl()}/bot/v1/drafts/current`)).status, 401);
  const headers = { "content-type": "application/json", authorization: "Bearer test-bot-api-token", "x-telegram-user-id": "77", "x-telegram-chat-id": "77" };
  const created = await fetch(`${baseUrl()}/bot/v1/drafts`, { method: "POST", headers: { ...headers, "idempotency-key": "menu-2" }, body: JSON.stringify({ role: "seller" }) });
  const draft = (await created.json()) as { id: string };
  assert.equal((await fetch(`${baseUrl()}/bot/v1/drafts/${draft.id}/confirm`, { method: "POST", headers, body: JSON.stringify({ revision: 1, confirmed: true }) })).status, 409);
});

async function request(path: string, method: string, input?: unknown) {
  const response = await crmFetch(path, {
    method, headers: { "content-type": "application/json" },
    body: input === undefined ? undefined : JSON.stringify(input),
  });
  return { status: response.status, body: await response.json() };
}

test("tasks persist, complete and reopen independently without changing the buyer stage", async () => {
  const { body: { card } } = await request("/cards", "POST", {
    role: "buyer", dealType: "purchase", phone: "+79990009901",
    budget: "5 млн", fields: { purchaseWhat: "Студия", selectionNotes: "Рядом с метро" },
  });
  const mortgage = await request(`/cards/${card.id}/tasks`, "POST", {
    type: "mortgage", title: "Подать на ипотеку", dueAt: "2026-10-01T09:00:00Z",
  });
  assert.equal(mortgage.status, 201);
  const taskId = mortgage.body.card.fields.tasks[0].id;
  await request(`/cards/${card.id}/tasks`, "POST", { type: "viewing", title: "Показ студии" });
  const completed = await request(`/cards/${card.id}/tasks/${taskId}`, "PATCH", { completed: true });
  assert.equal(completed.status, 200);
  assert.ok(completed.body.card.fields.tasks[0].completedAt);
  assert.equal(completed.body.card.fields.tasks[1].completedAt, null);
  assert.equal(completed.body.card.stage, "selection");
  // A form opened before task creation must not erase tasks or qualification fields.
  await request(`/cards/${card.id}`, "PATCH", { fields: { selectionNotes: "Добавили новый вариант", tasks: [] } });
  const saved = await request(`/cards/${card.id}`, "GET");
  assert.equal(saved.body.card.fields.tasks.length, 2);
  assert.equal(saved.body.card.fields.purchaseWhat, "Студия");
  assert.equal(saved.body.card.fields.selectionNotes, "Добавили новый вариант");
  const reopened = await request(`/cards/${card.id}/tasks/${taskId}`, "PATCH", { completed: false });
  assert.equal(reopened.body.card.fields.tasks[0].completedAt, null);
});

test("task deadline edits preserve completion, other tasks and card stage", async () => {
  const { body: { card } } = await request("/cards", "POST", {
    role: "buyer", dealType: "purchase", phone: "+79990009908",
    fields: { purchaseWhat: "Квартира" },
  });
  const created = await request(`/cards/${card.id}/tasks`, "POST", {
    type: "viewing", title: "Показ", dueAt: "2026-10-01T09:00:00Z",
  });
  const taskId = created.body.card.fields.tasks[0].id;
  await request(`/cards/${card.id}/tasks`, "POST", { type: "call", title: "Звонок" });
  const completed = await request(`/cards/${card.id}/tasks/${taskId}`, "PATCH", { completed: true });
  const before = completed.body.card;
  const dueAt = "2026-10-02T12:30:00+03:00";
  const changed = await request(`/cards/${card.id}/tasks/${taskId}`, "PATCH", { dueAt });
  assert.equal(changed.status, 200);
  assert.deepEqual(changed.body.card.fields.tasks[0], { ...before.fields.tasks[0], dueAt });
  assert.deepEqual(changed.body.card.fields.tasks[1], before.fields.tasks[1]);
  assert.equal(changed.body.card.stage, before.stage);
  assert.equal(changed.body.card.fields.purchaseWhat, "Квартира");
  const saved = await request(`/cards/${card.id}`, "GET");
  assert.deepEqual(saved.body.card.fields.tasks, changed.body.card.fields.tasks);
  const cleared = await request(`/cards/${card.id}/tasks/${taskId}`, "PATCH", { dueAt: null });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.card.fields.tasks[0].dueAt, null);
  assert.equal(cleared.body.card.fields.tasks[0].completedAt, before.fields.tasks[0].completedAt);
});

test("task patches reject invalid deadlines and empty mutations without changing saved data", async () => {
  const { body: { card } } = await request("/cards", "POST", {
    role: "seller", dealType: "sale", phone: "+79990009909",
  });
  const created = await request(`/cards/${card.id}/tasks`, "POST", { type: "call", title: "Звонок" });
  const task = created.body.card.fields.tasks[0];
  for (const input of [
    {}, { title: "Игнорируемое изменение" }, { completed: null }, { completed: "true" },
    { dueAt: "tomorrow" }, { dueAt: "2026-02-30T09:00:00Z" },
    { dueAt: "2026-10-02T12:30:00" }, { dueAt: 123 },
    { completed: true, dueAt: "invalid" },
  ]) {
    assert.equal((await request(`/cards/${card.id}/tasks/${task.id}`, "PATCH", input)).status, 400);
  }
  assert.deepEqual((await request(`/cards/${card.id}`, "GET")).body.card.fields.tasks[0], task);
});

test("task patches can change deadline and completion together", async () => {
  const { body: { card } } = await request("/cards", "POST", {
    role: "buyer", dealType: "purchase", phone: "+79990009910",
  });
  const created = await request(`/cards/${card.id}/tasks`, "POST", { type: "viewing", title: "Показ" });
  const taskId = created.body.card.fields.tasks[0].id;
  const dueAt = "2026-10-03T09:00:00Z";
  const completed = await request(`/cards/${card.id}/tasks/${taskId}`, "PATCH", { dueAt, completed: true });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.card.fields.tasks[0].dueAt, dueAt);
  assert.ok(completed.body.card.fields.tasks[0].completedAt);
  const reopened = await request(`/cards/${card.id}/tasks/${taskId}`, "PATCH", { dueAt: null, completed: false });
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.card.fields.tasks[0].dueAt, null);
  assert.equal(reopened.body.card.fields.tasks[0].completedAt, null);
});

test("task validation rejects invalid dates, missing titles and buyer tasks on sellers", async () => {
  const { body: { card } } = await request("/cards", "POST", { role: "seller", dealType: "sale", phone: "+79990009902" });
  for (const input of [
    { type: "call", title: "Позвонить", dueAt: "tomorrow" },
    { type: "call", title: " " },
    { type: "mortgage", title: "Подать на ипотеку" },
  ]) assert.equal((await request(`/cards/${card.id}/tasks`, "POST", input)).status, 400);
  assert.equal((await request(`/cards/${card.id}/tasks`, "POST", { type: "call", title: "Позвонить продавцу" })).status, 201);
  assert.equal((await request(`/cards/${card.id}/tasks/unknown`, "PATCH", { completed: true })).status, 404);
});

test("promised calls can be cleared and invalid reminder timestamps cannot be saved", async () => {
  const { body: { card } } = await request("/cards", "POST", {
    role: "buyer", dealType: "purchase", phone: "+79990009903", promisedCallAt: "2026-10-01T09:00:00Z",
  });
  const result = await request(`/cards/${card.id}`, "PATCH", { promisedCallAt: null });
  assert.equal(result.status, 200);
  assert.equal(result.body.card.promisedCallAt, null);
  assert.equal((await request(`/cards/${card.id}`, "PATCH", { promisedCallAt: "invalid" })).status, 400);
  assert.equal((await request(`/cards/${card.id}`, "GET")).body.card.promisedCallAt, null);
});

test("concurrent card writes detect stale versions instead of erasing changes", async () => {
  const created = await request("/cards", "POST", { role: "buyer", dealType: "purchase", phone: "+79990009904" });
  const isolated = createMemoryStore([created.body.card]);
  const card = created.body.card;
  const first = await isolated.update(card.id, { budget: "5 млн" }, card.updatedAt);
  const stale = await isolated.update(card.id, { budget: "3 млн" }, card.updatedAt);
  assert.equal(first?.budget, "5 млн");
  assert.equal(stale, null);
  assert.equal((await isolated.getById(card.id))?.budget, "5 млн");
});

test("optional qualification fields can be cleared without dropping the rest of the card", async () => {
  for (const [role, dealType, field, value] of [
    ["buyer", "purchase", "finish", "renovated"],
    ["seller", "sale", "whoseApartment", "own"],
  ] as const) {
    const { body: { card } } = await request("/cards", "POST", {
      role, dealType, phone: "+79990009905", name: "Тест", fields: { [field]: value, area: "30" },
    });
    const cleared = await request(`/cards/${card.id}`, "PATCH", { name: null, fields: { [field]: null } });
    assert.equal(cleared.status, 200);
    assert.equal(cleared.body.card.name, null);
    assert.equal(cleared.body.card.fields[field], undefined);
    assert.equal(cleared.body.card.fields.area, "30");
  }
});

test("completing a stale promised call cannot remove its rescheduled replacement", async () => {
  const first = "2026-10-01T09:00:00Z";
  const next = "2026-10-02T09:00:00Z";
  const { body: { card } } = await request("/cards", "POST", {
    role: "buyer", dealType: "purchase", phone: "+79990009906", promisedCallAt: first,
  });
  await request(`/cards/${card.id}`, "PATCH", { promisedCallAt: next });
  const stale = await request(`/cards/${card.id}/promised-call/complete`, "POST", { expectedDueAt: first });
  assert.equal(stale.status, 409);
  assert.equal((await request(`/cards/${card.id}`, "GET")).body.card.promisedCallAt, next);
  const completed = await request(`/cards/${card.id}/promised-call/complete`, "POST", { expectedDueAt: next });
  assert.equal(completed.status, 200);
  assert.equal(completed.body.card.promisedCallAt, null);
});

test("previously recorded taskTitle survives new tasks and can be completed", async () => {
  const { body: { card } } = await request("/cards", "POST", {
    role: "seller", dealType: "sale", phone: "+79990009907", fields: { taskTitle: "Проверить выписку" },
  });
  const created = await request(`/cards/${card.id}/tasks`, "POST", { type: "call", title: "Позвонить" });
  assert.equal(created.body.card.fields.tasks.length, 2);
  const previous = created.body.card.fields.tasks.find((task: { title: string }) => task.title === "Проверить выписку");
  const done = await request(`/cards/${card.id}/tasks/${previous.id}`, "PATCH", { completed: true });
  assert.ok(done.body.card.fields.tasks[0].completedAt);
  const next = await request(`/cards/${card.id}/tasks`, "POST", { type: "other", title: "Собрать документы" });
  assert.equal(next.body.card.fields.tasks.length, 3);
  assert.ok(next.body.card.fields.tasks[0].completedAt);
});

test("invalid card IDs are rejected consistently before database access", async () => {
  for (const [path, method, body] of [
    ["/cards/not-a-uuid", "GET", undefined],
    ["/cards/not-a-uuid", "PATCH", { name: "Тест" }],
    ["/cards/not-a-uuid/tasks", "POST", { type: "call", title: "Звонок" }],
    ["/cards/not-a-uuid/promised-call/complete", "POST", {}],
    ["/cards/not-a-uuid/tasks/unknown", "PATCH", { completed: true }],
  ] as const) {
    const result = await request(path, method, body);
    assert.equal(result.status, 400);
    assert.equal(result.body.issues[0].path, "id");
  }
  assert.equal((await request("/cards/00000000-0000-4000-8000-000000000001", "GET")).status, 404);
});

test("invalid birthdays return 400 and preserve the saved birthday", async () => {
  const input = { role: "buyer", dealType: "purchase", phone: "+79990009920", birthday: "2000-02-29" };
  const { body: { card } } = await request("/cards", "POST", input);
  for (const birthday of ["garbage", "2026-02-29", "2026-02-30"]) {
    assert.equal((await request("/cards", "POST", { ...input, birthday })).status, 400);
    assert.equal((await request(`/cards/${card.id}`, "PATCH", { birthday })).status, 400);
    assert.equal((await request(`/cards/${card.id}`, "GET")).body.card.birthday, input.birthday);
  }
  const cleared = await request(`/cards/${card.id}`, "PATCH", { birthday: null });
  assert.equal(cleared.status, 200);
  assert.equal(cleared.body.card.birthday, null);
});

test("clearing the buyer stage persists no selection or referral substatus", async () => {
  const { body: { card } } = await request("/cards", "POST", {
    role: "buyer", dealType: "purchase", phone: "+79990009921",
  });
  for (const stage of ["selection", "referral"]) {
    await request(`/cards/${card.id}`, "PATCH", { stage });
    assert.equal((await request(`/cards/${card.id}`, "PATCH", { stage: null })).status, 200);
    const saved = (await request(`/cards/${card.id}`, "GET")).body.card;
    assert.equal(saved.stage, null);
    assert.equal(saved.selectionStatus, null);
    assert.equal(saved.referralStatus, null);
  }
});


async function botRequest(path: string, body: unknown, key = path) {
  const response = await fetch(`${baseUrl()}/bot/v1${path}`, { method: "POST", headers: {
    authorization: "Bearer test-bot-api-token", "content-type": "application/json",
    "x-telegram-user-id": "99", "x-telegram-chat-id": "99", "idempotency-key": key,
  }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() as any };
}
const phoneCandidate = (phone: string | null) => ({ name: null, phone, objectType: null,
  address: null, source: null, budget: null, temperature: null, payment: null,
  promisedCallAt: null, fields: {}, notes: [] });

test("bot requires only phone for both roles and rejects confirmation without it", async () => {
  for (const role of ["buyer", "seller"]) {
    const { body: draft } = await botRequest("/drafts", { role }, `phone-only-${role}`);
    assert.equal((await botRequest(`/drafts/${draft.id}/confirm`, { revision: 0, confirmed: true })).status, 422);
    const { body: ready } = await botRequest(`/drafts/${draft.id}/messages`, {
      kind: "text", text: "+79990009930", messageId: 900, updateId: 900,
      extraction: phoneCandidate("+79990009930"),
    });
    assert.equal(ready.canConfirm, true);
    const saved = await botRequest(`/drafts/${draft.id}/confirm`, { revision: ready.revision, confirmed: true });
    assert.equal(saved.status, 200);
    const card = (await request(`/cards/${saved.body.cardId}`, "GET")).body.card;
    assert.equal(card.name, null);
    assert.equal(card.budget, null);
    assert.deepEqual(card.fields, { paymentMethods: [] });
  }
});

test("CRM edit preserves existing data, updates same card and rejects stale writes", async () => {
  const { body: { card } } = await request("/cards", "POST", {
    role: "buyer", dealType: "purchase", phone: "+79990009931", name: "До правки",
    birthday: "2000-01-02", stage: "referral", payment: ["cash", "installment"], fields: { area: "70", tasks: [{
      id: "00000000-0000-4000-8000-000000000088", type: "call", title: "Позвонить", dueAt: null, completedAt: null,
    }] },
  });
  assert.ok(card);
  const found = await botRequest("/clients/search", { phone: "8 (999) 000-99-31" });
  assert.ok(found.body.some((item: any) => item.id === card.id));
  const { body: draft } = await botRequest(`/clients/${card.id}/edit`, {}, "edit-first");
  assert.equal(draft.targetCardId, card.id);
  assert.equal((await request(`/cards/${card.id}`, "GET")).body.card.name, "До правки");
  const { body: ready } = await botRequest(`/drafts/${draft.id}/messages`, {
    kind: "text", text: "Имя После правки", messageId: 901, updateId: 901,
    extraction: { ...phoneCandidate(null), name: "После правки" },
  });
  const confirm = () => botRequest(`/drafts/${draft.id}/confirm`, { revision: ready.revision, confirmed: true });
  assert.equal((await confirm()).body.cardId, card.id);
  assert.equal((await confirm()).body.cardId, card.id);
  const saved = (await request(`/cards/${card.id}`, "GET")).body.card;
  assert.equal(saved.name, "После правки");
  assert.equal(saved.birthday, card.birthday);
  assert.equal(saved.stage, card.stage);
  assert.deepEqual(saved.payment, ["cash", "installment"]);
  assert.deepEqual(saved.fields, card.fields);
  const { body: stale } = await botRequest(`/clients/${card.id}/edit`, {}, "edit-second");
  await request(`/cards/${card.id}`, "PATCH", { budget: "10 млн" });
  assert.equal((await botRequest(`/drafts/${stale.id}/confirm`, { revision: stale.revision, confirmed: true })).status, 409);
  assert.equal((await request(`/cards/${card.id}`, "GET")).body.card.budget, "10 млн");
});

test("usage survives separate requests, deduplicates events and filters drafts", async () => {
  const row = { id: "00000000-0000-4000-8000-000000000099", keyId: "abcdef0123456789", draftId: "example",
    totalTokens: 120, estimatedUsd: 0.0001 };
  assert.equal((await botRequest("/usage", row)).status, 200);
  await botRequest("/usage", row);
  assert.deepEqual((await botRequest("/usage/report", { keyId: row.keyId })).body,
    { count: 1, tokens: 120, usd: 0.0001, unknown: 0 });
  assert.equal((await botRequest("/usage/report", { keyId: row.keyId, draftId: "other" })).body.count, 0);
});

after(() => {
  server.close();
});

test("payment methods support multiple choices, clearing, legacy values, and preserve card details", async () => {
  const created = await request("/cards", "POST", {
    role: "buyer", dealType: "purchase", phone: "+79990009999",
    payment: ["installment", "cash", "mortgage", "cash"],
    fields: { purchaseWhat: "Квартира", selectionNotes: "Сохранить подборку" },
  });
  assert.equal(created.status, 201);
  const card = created.body.card;
  assert.deepEqual(card.payment, ["cash", "mortgage", "installment"]);
  assert.deepEqual(card.fields.paymentMethods, card.payment);
  await request(`/cards/${card.id}/tasks`, "POST", { type: "call", title: "Звонок" });
  for (const payment of [["cash", "installment"], ["installment"], [], "mortgage", null]) {
    const updated = await request(`/cards/${card.id}`, "PATCH", { payment });
    assert.equal(updated.status, 200);
    const expected = payment === null ? [] : typeof payment === "string" ? [payment] : payment;
    const saved = await request(`/cards/${card.id}`, "GET");
    assert.deepEqual(saved.body.card.payment, expected);
    assert.deepEqual(saved.body.card.fields.paymentMethods, expected);
    assert.equal(saved.body.card.fields.purchaseWhat, "Квартира");
    assert.equal(saved.body.card.fields.selectionNotes, "Сохранить подборку");
    assert.equal(saved.body.card.fields.tasks.length, 1);
  }
  const invalid = await request(`/cards/${card.id}`, "PATCH", { payment: ["cash", "unknown"] });
  assert.equal(invalid.status, 400);
  const saved = await request(`/cards/${card.id}`, "GET");
  assert.deepEqual(saved.body.card.payment, []);
  const statuses = await request("/statuses", "GET");
  assert.deepEqual(statuses.body.payments.map((item: { value: string }) => item.value), ["cash", "mortgage", "installment"]);
});

test("Supabase rows retain all payment choices and read old single-choice cards", () => {
  const insert = parseNewCard({ role: "buyer", dealType: "purchase", phone: "+79990009999", payment: ["cash", "mortgage", "installment"] });
  const base = { id: "test-id", created_at: "2026-09-19T00:00:00Z", updated_at: "2026-09-19T00:00:00Z" };
  for (const payment of [["cash", "mortgage", "installment"], ["installment"], []] as CardDto["payment"][]) {
    const row = { ...cardToInsertRow({ ...insert, payment }), ...base };
    assert.ok(row.payment === null || row.payment === "cash" || row.payment === "mortgage");
    assert.deepEqual(cardFromRow(row).payment, payment);
  }
  const legacyRow = { ...cardToInsertRow(insert), ...base, payment: "mortgage" as const, fields: {} };
  assert.deepEqual(cardFromRow(legacyRow).payment, ["mortgage"]);
  assert.deepEqual(cardFromRow({ ...legacyRow, fields: { paymentMethods: [] } }).payment, []);
});
