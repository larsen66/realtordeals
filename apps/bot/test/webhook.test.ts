import assert from "node:assert/strict";
import { test } from "node:test";
import type { Update } from "grammy/types";
import { handleWebhook } from "../api/telegram.js";

process.env.TELEGRAM_WEBHOOK_SECRET = "test_webhook-secret";

test("webhook rejects unsupported methods and invalid secrets", async () => {
  const get = await handleWebhook(new Request("https://bot.example/api/telegram"), () => undefined);
  assert.equal(get.status, 405);

  const denied = await handleWebhook(new Request("https://bot.example/api/telegram", {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": "wrong" },
    body: JSON.stringify({ update_id: 1 }),
  }), () => undefined);
  assert.equal(denied.status, 401);
});

test("webhook acknowledges a valid update and schedules processing", async () => {
  let scheduled: Promise<unknown> | undefined;
  let handled: Update | undefined;
  const response = await handleWebhook(new Request("https://bot.example/api/telegram", {
    method: "POST",
    headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": "test_webhook-secret" },
    body: JSON.stringify({ update_id: 42, message: { message_id: 1 } }),
  }), promise => { scheduled = promise; }, async update => { handled = update; });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.ok(scheduled);
  await scheduled;
  assert.equal(handled?.update_id, 42);
});
