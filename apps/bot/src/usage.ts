import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { UsageEvent } from "@rieltordeals/worker";

export const draftUsageContext = new AsyncLocalStorage<string>();

export function createUsageLog(path: string, apiKey: string) {
  const keyId = createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const startedAt = new Date().toISOString();
  if (!existsSync(path)) appendFileSync(path, "", { mode: 0o600 });
  return {
    record(event: UsageEvent) {
      const entry = { ...event, event: "openai.usage", keyId, draftId: draftUsageContext.getStore() };
      console.log(JSON.stringify(entry));
      appendFileSync(path, JSON.stringify(entry) + "\n", { mode: 0o600 });
    },
    draftReport(draftId: string): string {
      try {
        const rows = readFileSync(path, "utf8").split("\n").filter(Boolean)
          .map(line => JSON.parse(line))
          .filter(row => row.keyId === keyId && row.draftId === draftId && row.event === "openai.usage") as UsageEvent[];
        const tokens = rows.reduce((sum, row) => sum + (row.totalTokens ?? 0), 0);
        const cost = rows.reduce((sum, row) => sum + (row.estimatedUsd ?? 0), 0);
        const complete = rows.length > 0 && rows.every(row => row.totalTokens !== null && row.estimatedUsd !== null);
        return `Потрачено за запрос: ${rows.length ? `${tokens} токенов · ≈ $${cost.toFixed(6)}${complete ? "" : " (неполные данные)"}` : "нет данных учёта"}\n` +
          "Учтены транскрибация, анализ и исправления этой заявки.\nОстаток: недоступен — API-ключ не сообщает баланс.";
      } catch {
        return "Потрачено за запрос: учёт временно недоступен.\nОстаток: недоступен — API-ключ не сообщает баланс.";
      }
    },
    report(): string {
      const rows: UsageEvent[] = [];
      let unreadable = 0;
      for (const line of readFileSync(path, "utf8").split("\n").filter(Boolean)) {
        try {
          const item = JSON.parse(line);
          if (item.keyId === keyId && item.event === "openai.usage") rows.push(item);
        } catch { unreadable++; }
      }
      const labels = { transcription: "Транскрибация", voice_analysis: "Анализ голосового", text_analysis: "Анализ текста" };
      const lines = [`Учёт этого бота для текущего ключа. Первая запись: ${rows[0]?.time ?? "запросов ещё нет (включён " + startedAt + ")"}.`];
      let total = 0;
      for (const [operation, label] of Object.entries(labels)) {
        const selected = rows.filter(row => row.operation === operation);
        const input = selected.reduce((sum, row) => sum + (row.inputTokens ?? 0), 0);
        const output = selected.reduce((sum, row) => sum + (row.outputTokens ?? 0), 0);
        const cost = selected.reduce((sum, row) => sum + (row.estimatedUsd ?? 0), 0);
        total += cost;
        lines.push(`${label}: ${selected.length} запросов; известные токены вход/выход ${input}/${output}; оценка $${cost.toFixed(6)}.`);
      }
      const unknown = rows.filter(row => row.estimatedUsd === null).length;
      lines.push(`Итого по известным данным: ≈ $${total.toFixed(6)}. Запросов без оценки: ${unknown}.`);
      if (unreadable) lines.push(`Нечитаемых записей: ${unreadable}; итог может быть неполным.`);
      lines.push("Прошлые запросы до включения учёта и вызовы этого ключа из других программ не включены. Это оценка расходов, не остаток счёта. Баланс: https://platform.openai.com/settings/organization/billing/overview");
      return lines.join("\n\n");
    },
  };
}

export function createCloudUsageLog(apiKey: string, apiUrl: string, apiToken: string) {
  const keyId = createHash("sha256").update(apiKey).digest("hex").slice(0, 16);
  const pending = new Set<Promise<void>>();
  let failed = false;
  async function request(path: string, body: unknown) {
    const response = await fetch(`${apiUrl}/bot/v1/usage${path}`, {
      method: "POST", headers: { authorization: `Bearer ${apiToken}`, "content-type": "application/json" },
      body: JSON.stringify(body), signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) throw new Error("Usage storage unavailable");
    return response.json();
  }
  async function report(draftId?: string) {
    await Promise.all([...pending]);
    try {
      const result = await request("/report", { keyId, draftId });
      return `${draftId ? "Расходы черновика" : "Расходы бота"}: ${result.count} запросов · ${result.tokens} токенов · ≈ $${Number(result.usd).toFixed(6)}.\n` +
        `Запросов с неполными данными: ${result.unknown}.` +
        (failed ? " Есть несохранённые записи расходов." : "") +
        "\nУчёт с момента включения. Это оценка, не баланс счёта; прежние запросы из runtime-логов не включены.";
    } catch { return "Сводка расходов временно недоступна. Записи запросов также остаются в runtime-логах."; }
  }
  return {
    record(event: UsageEvent) {
      const draftId = draftUsageContext.getStore() ?? null;
      console.log(JSON.stringify({ ...event, event: "openai.usage", keyId, draftId }));
      const promise = request("", { id: randomUUID(), keyId, draftId, totalTokens: event.totalTokens, estimatedUsd: event.estimatedUsd })
        .then(() => undefined).catch(() => { failed = true; });
      pending.add(promise);
      void promise.finally(() => pending.delete(promise));
    },
    flush: () => Promise.all([...pending]),
    report: () => report(),
    draftReport: (draftId: string) => report(draftId),
  };
}
