export type UsageOperation = "transcription" | "voice_analysis" | "text_analysis";
export type UsageEvent = {
  time: string; operation: UsageOperation; model: string; requestId: string | null;
  durationMs: number; httpStatus: number | null; outcome: "response" | "http_error" | "network_error";
  inputTokens: number | null; outputTokens: number | null; totalTokens: number | null;
  cachedInputTokens: number | null; audioInputTokens: number | null; audioSeconds: number | null;
  estimatedUsd: number | null; pricingDate: string;
};

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

// Standard public rates, checked 2026-09-20. Estimates are not a billing balance.
// https://developers.openai.com/api/docs/pricing
// https://developers.openai.com/api/docs/models/gpt-4o-mini
export function usageEvent(meta: Pick<UsageEvent, "operation" | "model" | "requestId" | "durationMs" | "httpStatus" | "outcome">,
  response: Record<string, unknown> = {}): UsageEvent {
  const usage = object(response.usage);
  const inputTokens = number(usage.input_tokens);
  const outputTokens = number(usage.output_tokens);
  const totalTokens = number(usage.total_tokens) ??
    (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
  const cachedInputTokens = number(object(usage.input_tokens_details).cached_tokens);
  const audioInputTokens = number(object(usage.input_token_details).audio_tokens);
  const audioSeconds = number(usage.seconds);
  let estimatedUsd: number | null = null;
  if (inputTokens !== null && outputTokens !== null && meta.outcome === "response") {
    if (/^gpt-4o-mini(?:-2024-07-18)?$/.test(meta.model) && meta.operation !== "transcription") {
      const cached = Math.min(cachedInputTokens ?? 0, inputTokens);
      estimatedUsd = ((inputTokens - cached) * 0.15 + cached * 0.075 + outputTokens * 0.60) / 1_000_000;
    } else if (/^gpt-4o-mini-transcribe(?:-2025-(?:03-20|12-15))?$/.test(meta.model) && meta.operation === "transcription") {
      estimatedUsd = (inputTokens * 1.25 + outputTokens * 5) / 1_000_000;
    }
  }
  return { ...meta, time: new Date().toISOString(), inputTokens, outputTokens, totalTokens,
    cachedInputTokens, audioInputTokens, audioSeconds, estimatedUsd, pricingDate: "2026-09-20" };
}
