import assert from "node:assert/strict";
import { test } from "node:test";
import { OpenAiAgent, OpenAiAgentError } from "../../worker/src/agent/openai.js";

const config = { apiKey: "offline-test-key", textModel: "test-text-model", transcriptionModel: "test-audio-model" };
const input = { role: "buyer" as const, sourceText: "Имя: Учебный клиент", currentFields: {} };
const schema = {
  jsonSchema: { type: "object", properties: { name: { type: ["string", "null"] } }, required: ["name"], additionalProperties: false },
  parse(value: unknown) {
    if (!value || typeof value !== "object" || !("name" in value) || typeof value.name !== "string") throw new Error("bad schema");
    return { name: value.name };
  },
};
const completion = (text: string) => Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text }] }] });

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
