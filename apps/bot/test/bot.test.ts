import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { DemoCrmGateway } from "../src/gateways/demo.js";
import { HttpCrmGateway } from "../src/gateways/http.js";
import { readConfig } from "../src/config.js";
import { draftSchema, type CrmGateway, type Draft } from "../src/contract.js";
import { renderDraft, reviewKeyboard } from "../src/presentation.js";
import { actor, harness } from "./harness.js";

const ready = async (g: DemoCrmGateway) => {
  const d = await g.create(actor, "buyer", "test-new");
  return g.submit(actor, d.id, { kind: "text", text: "Имя: Учебный клиент\nТелефон: +7 000 000-00-00", messageId: 10, updateId: 10 });
};

test("usage footer is attached only after confirmation and uses the saved draft ID", async () => {
  const g = new DemoCrmGateway();
  const d = await ready(g);
  const h = harness(g, id => { assert.equal(id, d.id); return "Потрачено за запрос: 110 токенов\nОстаток: недоступен"; });
  await h.text("/draft");
  assert.doesNotMatch(h.output(), /Потрачено за запрос/);
  await h.click(`ok:${d.id}:${d.revision}`);
  assert.match(h.sent.filter(s => s.method === "sendMessage").at(-1)!.text!, /Потрачено за запрос: 110 токенов/);
  assert.equal(g.confirmedCount, 1);
  h.close();
});

test("expired draft button explains recovery instead of claiming CRM is unavailable", async () => {
  const methods: string[] = [];
  const gateway = new HttpCrmGateway("http://localhost:3001", "test-token", async (_url, init) => {
    methods.push(init?.method ?? "GET");
    return new Response(JSON.stringify({ error: "draft not found" }), { status: 404 });
  });
  const h = harness(gateway);
  await h.click("ok:expired-draft:1");
  assert.match(h.output(), /Черновик этой кнопки больше недоступен/);
  assert.match(h.output(), /\/draft/);
  assert.doesNotMatch(h.output(), /Не удалось получить подтверждение от CRM/);
  assert.deepEqual(methods, ["GET"]);
  h.close();
});

test("end-to-end text → preview → explicit confirmation; no save on plain 'всё ок'", async () => {
  const g = new DemoCrmGateway(); const h = harness(g);
  await h.text("/start"); await h.click("new:buyer");
  await h.text("Имя: Учебный клиент\nТелефон: +7 000 000-00-00\nБюджет: 5 млн");
  assert.equal(g.confirmedCount, 0);
  await h.text("всё ок");
  assert.equal(g.confirmedCount, 0);
  const d = (await g.current(actor))!;
  await h.click(`ok:${d.id}:${d.revision}`);
  assert.equal(g.confirmedCount, 1);
  assert.match(h.output(), /В CRM ничего не отправлено/);
  h.close();
});
test("missing phone prevents confirmation and preserves notes", async () => {
  const g = new DemoCrmGateway(); const h = harness(g);
  await h.click("new:seller"); await h.text("Имя: Учебный клиент\nСоседи спокойные");
  const d = (await g.current(actor))!;
  await h.click(`ok:${d.id}:${d.revision}`);
  assert.equal(g.confirmedCount, 0); assert.equal(d.canConfirm, false);
  assert.ok(d.notes.includes("Соседи спокойные"));
  assert.ok(!reviewKeyboard(d).inline_keyboard.flat().some((b) => "callback_data" in b && b.callback_data.startsWith("ok:")));
  h.close();
});
test("stale confirmation shows new fields and does not save", async () => {
  const g = new DemoCrmGateway(); const old = await ready(g); const h = harness(g);
  await h.text("Бюджет: 7 млн");
  await h.click(`ok:${old.id}:${old.revision}`);
  assert.equal(g.confirmedCount, 0); assert.match(h.output(), /старой версии/);
  h.close();
});
test("duplicate role click, update and confirmation do not duplicate data", async () => {
  const g = new DemoCrmGateway(); const h = harness(g);
  await h.click("new:buyer"); const first = await g.current(actor);
  await h.click("new:buyer"); assert.equal((await g.current(actor))!.id, first!.id);
  await h.text("Телефон: +7 000 000-00-00", 42, 500);
  const version = (await g.current(actor))!.revision;
  await h.text("Телефон: +7 000 000-00-00", 42, 500);
  const d = (await g.current(actor))!; assert.equal(d.revision, version);
  await h.click(`ok:${d.id}:${d.revision}`); await h.click(`ok:${d.id}:${d.revision}`);
  assert.equal(g.confirmedCount, 1); h.close();
});
test("new card preserves previous draft and separates seller fields", async () => {
  const g = new DemoCrmGateway(); const old = await ready(g); const h = harness(g);
  await h.click("new:seller", 42, 200);
  const current = (await g.current(actor))!;
  assert.notEqual(current.id, old.id); assert.equal(current.role, "seller");
  assert.ok(current.fields.some((f) => f.key === "price"));
  assert.ok(!current.fields.some((f) => f.key === "budget"));
  assert.deepEqual(await g.get(actor, old.id), old);
  await h.click(`fix:${old.id}:${old.revision}`);
  assert.match(h.output(), /другая заявка/); h.close();
});
test("unknown user and group have no gateway access", async () => {
  const g = new DemoCrmGateway(); const h = harness(g);
  await h.text("/start", 99); await h.click("new:buyer", 99); await h.text("/start", 42, 88, true);
  assert.equal(await g.current(actor), null);
  await assert.rejects(g.get({ telegramUserId: 99, chatId: 99 }, (await ready(g)).id));
  assert.match(h.output(), /только разрешенному/); h.close();
});
test("voice is accepted as metadata, never fake transcribed in demo; oversize blocked", async () => {
  const g = new DemoCrmGateway(); const h = harness(g); await h.click("new:buyer");
  await h.voice(); assert.match(h.output(), /не скачивается и не распознается/);
  const rev = (await g.current(actor))!.revision;
  await h.voice(301); assert.equal((await g.current(actor))!.revision, rev);
  assert.match(h.output(), /слишком большое или длинное/); h.close();
});
test("text before role asks to resend instead of claiming storage", async () => {
  const g = new DemoCrmGateway(); const h = harness(g); await h.text("Текст без роли");
  assert.match(h.output(), /пришлите сообщение еще раз/); assert.equal(await g.current(actor), null); h.close();
});
test("API error never falls back to demo or emits raw error/secret", async () => {
  const g = new HttpCrmGateway("http://localhost", "test-secret", async () => new Response("sensitive-provider-body", { status: 501 }));
  const h = harness(g); await h.text("/draft");
  assert.match(h.output(), /Не считаю данные сохраненными/);
  assert.doesNotMatch(h.output(), /sensitive-provider-body|test-secret|ДЕМО|Сохранено в CRM/); h.close();
});
test("HTTP gateway carries owner and deterministic confirmation key, validates output", async () => {
  const d = await ready(new DemoCrmGateway());
  let request: RequestInit | undefined;
  const g = new HttpCrmGateway("https://crm.example", "secret", async (url, init) => {
    assert.match(String(url), /\/bot\/v1\/drafts\/demo-1\/confirm$/); request = init;
    return Response.json({ ...d, status: "confirmed", canConfirm: false, cardId: "card-1" });
  });
  assert.equal((await g.confirm(actor, d.id, d.revision)).cardId, "card-1");
  const headers = new Headers(request!.headers);
  assert.equal(headers.get("x-telegram-user-id"), "42");
  assert.equal(headers.get("idempotency-key"), `confirm:${d.id}:${d.revision}`);
  assert.equal(request!.redirect, "error");
  assert.deepEqual(JSON.parse(request!.body as string), { revision: d.revision, confirmed: true });
  const broken = new HttpCrmGateway("https://crm.example", "secret", async () => Response.json({ canConfirm: true }));
  await assert.rejects(broken.current(actor), /invalid/);
});
test("schema fails closed for inconsistent API state", async () => {
  const d = await ready(new DemoCrmGateway());
  assert.equal(draftSchema.safeParse({ ...d, status: "processing", canConfirm: true }).success, false);
  assert.equal(draftSchema.safeParse({ ...d, issues: ["Телефон"] }).success, false);
  assert.equal(draftSchema.safeParse({ ...d, status: "confirmed", canConfirm: false, cardId: null }).success, false);
});
test("long preview preserves text and fits Telegram limits; callback data under 64 bytes", async () => {
  const d: Draft = await ready(new DemoCrmGateway());
  const long = "<tag>Жильё🙂".repeat(2000);
  d.notes = [long];
  const chunks = renderDraft(d, false);
  assert.ok(chunks.every((s) => s.length <= 3500));
  assert.ok(chunks.join("").replaceAll("\n", "").includes(long));
  for (const b of reviewKeyboard({ ...d, id: "x".repeat(36), revision: 2147483647 }).inline_keyboard.flat()) {
    if ("callback_data" in b) assert.ok(Buffer.byteLength(b.callback_data) <= 64);
  }
});
test("configuration requires mode, token, allowlist, and secure backend", () => {
  const base = { BOT_MODE: "demo", TELEGRAM_BOT_TOKEN: "123:test", TELEGRAM_ALLOWED_USER_IDS: "42" };
  assert.equal(readConfig(base).mode, "demo");
  assert.throws(() => readConfig({ ...base, BOT_MODE: undefined }));
  assert.throws(() => readConfig({ ...base, TELEGRAM_ALLOWED_USER_IDS: "" }));
  assert.throws(() => readConfig({ ...base, BOT_MODE: "api", CRM_API_URL: "http://public.example", CRM_API_TOKEN: "secret" }));
  assert.equal(readConfig({ ...base, BOT_MODE: "api", CRM_API_URL: "http://127.0.0.1:3001", CRM_API_TOKEN: "secret", OPENAI_API_KEY: "test" }).mode, "api");
});

test("queued processing automatically delivers review without confirming", async () => {
  const base = new DemoCrmGateway();
  const d = await ready(base);
  const pending: Draft = { ...d, status: "processing", canConfirm: false };
  const gateway: CrmGateway = {
    mode: "api", current: async () => pending, create: async () => pending,
    get: async () => d, submit: async () => pending,
    confirm: async () => { throw new Error("Must not confirm automatically"); },
  };
  const h = harness(gateway);
  try {
    await h.text("/draft");
    assert.match(h.output(), /Идет обработка/);
    await delay(2300);
    assert.match(h.output(), /Проверьте все поля/);
    assert.doesNotMatch(h.output(), /Сохранено в CRM/);
  } finally { h.close(); }
});

test("API confirmation success is announced only after confirmed response", async () => {
  const base = new DemoCrmGateway(); const d = await ready(base);
  let confirmed = false;
  const gateway: CrmGateway = {
    mode: "api", current: async () => d, create: async () => d, get: async () => d, submit: async () => d,
    confirm: async () => { confirmed = true; return { ...d, status: "confirmed", canConfirm: false, cardId: "test-card-1" }; },
  };
  const h = harness(gateway);
  await h.text("/draft"); assert.equal(confirmed, false);
  assert.doesNotMatch(h.output(), /Сохранено в CRM/);
  await h.click(`ok:${d.id}:${d.revision}`);
  assert.equal(confirmed, true); assert.match(h.output(), /Сохранено в CRM. Карточка: test-card-1/);
  h.close();
});

test("HTTP rejects a response for a different draft or confirmation revision", async () => {
  const d = await ready(new DemoCrmGateway());
  const wrong = new HttpCrmGateway("https://crm.example", "secret", async () => Response.json({ ...d, id: "wrong-draft" }));
  await assert.rejects(wrong.get(actor, d.id), /invalid/);
  const changed = new HttpCrmGateway("https://crm.example", "secret", async () => Response.json({ ...d, revision: d.revision + 1 }));
  await assert.rejects(changed.confirm(actor, d.id, d.revision), /invalid/);
});


test("short role commands create drafts and help explains phone-only requirement", async () => {
  const gateway = new DemoCrmGateway();
  const h = harness(gateway);
  await h.text("/buyer");
  assert.equal((await gateway.current(actor))?.role, "buyer");
  await h.text("/seller");
  assert.equal((await gateway.current(actor))?.role, "seller");
  await h.text("/help");
  assert.match(h.output(), /Обязателен только телефон/);
  await h.text("/edit");
  assert.match(h.output(), /при подключении CRM/);
  h.close();
});

test("Telegram menu registers all commands and enables the menu button", async () => {
  const { registerMenu, commands } = await import("../src/menu.js");
  const h = harness(new DemoCrmGateway());
  const calls: { method: string; payload: unknown }[] = [];
  h.bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload });
    return { ok: true, result: true } as never;
  });
  await registerMenu(h.bot);
  assert.deepEqual(calls.map(call => call.method), ["setMyCommands", "setChatMenuButton"]);
  assert.deepEqual(commands.map(command => command.command), ["buyer", "seller", "edit", "draft", "usage", "help"]);
  h.close();
});
