import assert from "node:assert/strict";
import { test } from "node:test";
import { OpenAiAgent, OpenAiAgentError } from "../../worker/src/agent/openai.js";
import { usageEvent, type UsageEvent } from "../../worker/src/agent/usage.js";
import { createUsageLog, draftUsageContext } from "../src/usage.js";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const config = { apiKey: "offline-test-key", textModel: "test-text-model", transcriptionModel: "test-audio-model" };
test("draft totals isolate concurrent clients, survive restart and disclose missing usage", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "draft-usage-")), "usage.jsonl");
  const log = createUsageLog(path, "test-key");
  await Promise.all(["a", "b"].map(id => draftUsageContext.run(id, async () => {
    await Promise.resolve();
    log.record(usageEvent(usageMeta, { usage: { input_tokens: id === "a" ? 100 : 900, output_tokens: 10 } }));
  })));
  const reopened = createUsageLog(path, "test-key");
  assert.match(reopened.draftReport("a"), /110 токенов/);
  assert.doesNotMatch(reopened.draftReport("a"), /910 токенов/);
  assert.match(reopened.draftReport("b"), /910 токенов/);
  assert.match(reopened.draftReport("old"), /нет данных учёта/);
  draftUsageContext.run("a", () => log.record(usageEvent(usageMeta)));
  assert.match(reopened.draftReport("a"), /неполные данные/);
  assert.match(reopened.draftReport("a"), /Остаток: недоступен/);
});
const input = { role: "buyer" as const, sourceText: "Имя: Учебный клиент", currentFields: {} };
const schema = {
  jsonSchema: { type: "object", properties: { name: { type: ["string", "null"] } }, required: ["name"], additionalProperties: false },
  parse(value: unknown) {
    if (!value || typeof value !== "object" || !("name" in value) || typeof value.name !== "string") throw new Error("bad schema");
    return { name: value.name };
  },
};
const completion = (text: string) => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text }] }] });

const usageMeta = { operation: "text_analysis" as const, model: "gpt-4o-mini", requestId: "req-test", durationMs: 10, httpStatus: 200, outcome: "response" as const };
test("usage prices cached input separately, distinguishes unknown costs and audio tokens", () => {
  const event = usageEvent(usageMeta, { usage: { input_tokens: 1000, output_tokens: 200, input_tokens_details: { cached_tokens: 400 } } });
  assert.equal(event.totalTokens, 1200);
  assert.ok(Math.abs(event.estimatedUsd! - 0.00024) < 1e-12);
  assert.equal(usageEvent(usageMeta).estimatedUsd, null);
  assert.equal(usageEvent({ ...usageMeta, model: "unknown" }, { usage: { input_tokens: 1, output_tokens: 1 } }).estimatedUsd, null);
  const audio = usageEvent({ ...usageMeta, model: "gpt-4o-mini-transcribe", operation: "transcription" }, {
    usage: { input_tokens: 1000, output_tokens: 100, input_token_details: { audio_tokens: 900, text_tokens: 100 } },
  });
  assert.equal(audio.audioInputTokens, 900);
  assert.equal(audio.estimatedUsd, 0.00175);
});
test("paid invalid output is counted and failed usage logging never triggers another model request", async () => {
  const events: UsageEvent[] = [];
  let calls = 0;
  const agent = new OpenAiAgent({ ...config, onUsage: event => { events.push(event); throw new Error("disk failed"); } }, async () => {
    calls++;
    return Response.json({ status: "incomplete", output: [], usage: { input_tokens: 50, output_tokens: 20 } });
  });
  await assert.rejects(agent.extract(input, schema, "voice_analysis"), /invalid_output/);
  assert.equal(events.length, 1);
  assert.equal(events[0]!.operation, "voice_analysis");
  assert.equal(events[0]!.totalTokens, 70);
  assert.equal(calls, 1);
});
test("usage journal survives restart, separates keys, and stores no plaintext key", () => {
  const path = join(mkdtempSync(join(tmpdir(), "realtordeals-usage-")), "usage.jsonl");
  const log = createUsageLog(path, "secret-test-key");
  log.record(usageEvent(usageMeta, { usage: { input_tokens: 1000, output_tokens: 200, input_tokens_details: { cached_tokens: 400 } } }));
  const reopened = createUsageLog(path, "secret-test-key");
  assert.match(reopened.report(), /1000\/200/);
  assert.match(reopened.report(), /0.000240/);
  assert.doesNotMatch(createUsageLog(path, "different-key").report(), /1000\/200/);
  assert.doesNotMatch(readFileSync(path, "utf8"), /secret-test-key/);
});

test("agent uses direct Responses API, strict supplied domain schema and no storage", async () => {
  const agent = new OpenAiAgent(config, async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(init!.body as string);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.deepEqual(body.text.format.schema, schema.jsonSchema);
    assert.deepEqual(JSON.parse(body.input[0].content), input);
    assert.match(body.instructions, /Не подтверждай и не сохраняй/);
    return completion('{"name":"Учебный клиент"}');
  });
  assert.deepEqual(await agent.extract(input, schema), { name: "Учебный клиент" });
});
test("transcription sends real file bytes and returns text, without model guessing", async () => {
  const agent = new OpenAiAgent(config, async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/audio/transcriptions");
    const form = init!.body as FormData;
    assert.equal(form.get("model"), "test-audio-model");
    assert.equal(form.get("language"), "ru");
    assert.equal(await (form.get("file") as File).text(), "fake-audio-for-test");
    return Response.json({ text: " Учебный текст " });
  });
  assert.equal(await agent.transcribe(new File(["fake-audio-for-test"], "voice.ogg")), "Учебный текст");
});
test("provider refusal never turns into fields", async () => {
  const agent = new OpenAiAgent(config, async () => Response.json({ status: "completed", output: [{ content: [{ type: "refusal", refusal: "test" }] }] }));
  await assert.rejects(agent.extract(input, schema), (e: unknown) => e instanceof OpenAiAgentError && e.code === "refusal");
});
test("invalid JSON, failed schema and incomplete output fail closed", async () => {
  for (const response of [completion("not-json"), completion('{"wrong":"field"}'), Response.json({ status: "incomplete", output: [] })]) {
    const agent = new OpenAiAgent(config, async () => response);
    await assert.rejects(agent.extract(input, schema), /invalid_output/);
  }
});
test("provider errors are redacted and not retried inside agent", async () => {
  let calls = 0;
  const agent = new OpenAiAgent(config, async () => { calls++; return new Response("private information", { status: 429 }); });
  await assert.rejects(agent.extract(input, schema), (e: unknown) => {
    assert.ok(e instanceof OpenAiAgentError); assert.equal(e.code, "rate_limit");
    assert.doesNotMatch(e.message, /private|offline-test-key/); return true;
  });
  assert.equal(calls, 1);
});
test("empty/unsupported audio and missing configuration rejected before network", async () => {
  assert.throws(() => new OpenAiAgent({ ...config, apiKey: "" }), /configuration/);
  const agent = new OpenAiAgent(config, async () => { throw new Error("Must not call"); });
  await assert.rejects(agent.transcribe(new File([], "empty.ogg")), /input/);
  await assert.rejects(agent.transcribe(new File(["data"], "file.exe")), /input/);
  await assert.rejects(agent.extract({ ...input, sourceText: "" }, schema), /input/);
});
