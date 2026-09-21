import { createBot } from "./bot.js";
import type { BotConfig } from "./config.js";
import { HttpCrmGateway } from "./gateways/http.js";
import { OpenAiAgent, type UsageEvent } from "@rieltordeals/worker";
import { CrmExtractor } from "./extraction.js";

export type UsageLog = {
  record(event: UsageEvent): void;
  report?(): string | Promise<string>;
  draftReport?(draftId: string): string | Promise<string>;
};

export async function setupBot(config: BotConfig, usage?: UsageLog) {
  const gateway = config.mode === "demo"
    ? new (await import("./gateways/demo.js")).DemoCrmGateway()
    : new HttpCrmGateway(config.apiUrl!, config.apiToken!);
  const extractor = config.mode === "api"
    ? new CrmExtractor(new OpenAiAgent({
      apiKey: config.openAiApiKey!,
      textModel: config.textModel!,
      transcriptionModel: config.transcriptionModel!,
      onUsage: usage?.record,
    }))
    : undefined;
  return createBot(config, gateway, extractor, usage?.report, usage?.draftReport);
}
