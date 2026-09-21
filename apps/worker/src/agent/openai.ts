import { EXTRACTION_INSTRUCTIONS } from "./prompt.js";
import { usageEvent, type UsageEvent, type UsageOperation } from "./usage.js";

// A library invoked by David's worker, never from a Telegram/HTTP handler.
// No queue, database, card confirmation or Telegram credentials live here.
export type CrmExtractionSchema<T> = {
  // Produced from the selected buyer/seller schema in packages/domain.
  jsonSchema: Record<string, unknown>;
  parse: (value: unknown) => T;
};
export type ExtractionInput = {
  role: "buyer" | "seller";
  sourceText: string;
  currentFields: Record<string, unknown>;
};
export class OpenAiAgentError extends Error {
  constructor(readonly code: "configuration" | "input" | "network" | "authentication" | "rate_limit" | "provider" | "refusal" | "invalid_output") {
    super(`OpenAI agent: ${code}`);
  }
}

export class OpenAiAgent {
  constructor(
    private options: { apiKey: string; textModel: string; transcriptionModel: string; onUsage?: (event: UsageEvent) => void },
    private fetcher: typeof fetch = fetch,
  ) {
    if (!options.apiKey.trim() || !options.textModel.trim() || !options.transcriptionModel.trim()) {
      throw new OpenAiAgentError("configuration");
    }
  }

  private async request(path: string, body: FormData | string, operation: UsageOperation, model: string): Promise<Record<string, unknown>> {
    const started = Date.now();
    const record = (outcome: UsageEvent["outcome"], response?: Response, data: Record<string, unknown> = {}) => {
      const event = usageEvent({ operation, model, outcome, durationMs: Date.now() - started,
        httpStatus: response?.status ?? null, requestId: response?.headers.get("x-request-id") ?? null }, data);
      // Telemetry failure must not turn an already-paid request into a retry.
      try { this.options.onUsage?.(event); }
      catch { console.error(JSON.stringify({ event: "openai.usage.write_failed" })); }
    };
    let response: Response;
    try {
      response = await this.fetcher(`https://api.openai.com/v1/${path}`, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(60_000),
        headers: { authorization: `Bearer ${this.options.apiKey}`,
          ...(typeof body === "string" ? { "content-type": "application/json" } : {}) },
        body,
      });
    } catch { record("network_error"); throw new OpenAiAgentError("network"); }
    // Leave retries to the worker. Never include provider error bodies or inputs in logs.
    if (!response.ok) { record("http_error", response); throw new OpenAiAgentError(
      [401, 403].includes(response.status) ? "authentication" :
        response.status === 429 ? "rate_limit" : "provider"); }
    let value: unknown;
    try {
      value = await response.json();
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    } catch { record("response", response); throw new OpenAiAgentError("invalid_output"); }
    record("response", response, value as Record<string, unknown>);
    return value as Record<string, unknown>;
  }

  async transcribe(file: File): Promise<string> {
    if (!file.size || file.size > 10 * 1024 * 1024 || !/\.(ogg|wav|mp3|mp4|m4a|mpeg|mpga|webm|flac)$/i.test(file.name)) {
      throw new OpenAiAgentError("input");
    }
    const body = new FormData();
    body.set("file", file);
    body.set("model", this.options.transcriptionModel);
    body.set("language", "ru");
    body.set("response_format", "json");
    const result = await this.request("audio/transcriptions", body, "transcription", this.options.transcriptionModel);
    if (typeof result.text !== "string" || !result.text.trim()) throw new OpenAiAgentError("invalid_output");
    return result.text.trim();
  }

  async extract<T>(input: ExtractionInput, schema: CrmExtractionSchema<T>, operation: "voice_analysis" | "text_analysis" = "text_analysis"): Promise<T> {
    if (!input.sourceText.trim() || input.sourceText.length > 100_000) throw new OpenAiAgentError("input");
    const result = await this.request("responses", JSON.stringify({
      model: this.options.textModel,
      store: false,
      instructions: EXTRACTION_INSTRUCTIONS,
      input: [{ role: "user", content: JSON.stringify(input) }],
      text: { format: { type: "json_schema", name: "crm_draft_fields", strict: true, schema: schema.jsonSchema } },
    }), operation, this.options.textModel);
    if (result.status !== "completed" || !Array.isArray(result.output)) throw new OpenAiAgentError("invalid_output");
    const texts: string[] = [];
    for (const item of result.output) {
      if (!item || typeof item !== "object" || !Array.isArray(item.content)) continue;
      for (const part of item.content) {
        if (part?.type === "refusal") throw new OpenAiAgentError("refusal");
        if (part?.type === "output_text" && typeof part.text === "string") texts.push(part.text);
      }
    }
    try { return schema.parse(JSON.parse(texts.join(""))); }
    catch { throw new OpenAiAgentError("invalid_output"); }
  }
}
