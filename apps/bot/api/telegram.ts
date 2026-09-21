import { timingSafeEqual } from "node:crypto";
import { waitUntil } from "@vercel/functions";
import type { Bot } from "grammy";
import { z } from "zod";
import { readConfig, readWebhookSecret } from "../src/config.js";
import { registerMenu } from "../src/menu.js";
import { setupBot } from "../src/setup.js";
import { createCloudUsageLog } from "../src/usage.js";

const updateSchema = z.object({ update_id: z.number().int().nonnegative() }).passthrough();
type TelegramUpdate = Parameters<Bot["handleUpdate"]>[0];

function equalSecret(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length
    && timingSafeEqual(actualBuffer, expectedBuffer);
}

let botPromise: ReturnType<typeof createRuntimeBot> | undefined;

async function createRuntimeBot() {
  const config = readConfig(process.env);
  if (config.mode !== "api") throw new Error("Vercel bot requires BOT_MODE=api");
  const usage = createCloudUsageLog(config.openAiApiKey!, config.apiUrl!, config.apiToken!);
  const runtime = await setupBot(config, usage);

  runtime.bot.catch(() => console.error(JSON.stringify({ service: "bot", event: "update.failed" })));
  await runtime.bot.init();
  await registerMenu(runtime.bot);
  return { bot: runtime.bot, usage };
}

async function processUpdate(update: TelegramUpdate) {
  const runtime = await (botPromise ??= createRuntimeBot().catch(error => { botPromise = undefined; throw error; }));
  try { await runtime.bot.handleUpdate(update); } finally { await runtime.usage.flush(); }
}

export async function handleWebhook(
  request: Request,
  defer: (promise: Promise<unknown>) => void = waitUntil,
  handle: (update: TelegramUpdate) => Promise<void> = processUpdate,
) {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });

  let expectedSecret: string;
  try {
    expectedSecret = readWebhookSecret(process.env);
  } catch {
    return Response.json({ error: "webhook is not configured" }, { status: 503 });
  }
  const actualSecret = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!equalSecret(actualSecret, expectedSecret)) return Response.json({ error: "access denied" }, { status: 401 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1024 * 1024) return Response.json({ error: "payload too large" }, { status: 413 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid update" }, { status: 400 });

  const update = parsed.data as unknown as TelegramUpdate;
  defer(handle(update).catch(() => {
    console.error(JSON.stringify({ service: "bot", event: "update.background_failed", updateId: update.update_id }));
  }));
  return Response.json({ ok: true });
}

export default { fetch: handleWebhook };
