import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createBot } from "./bot.js";
import { readConfig } from "./config.js";
import { HttpCrmGateway } from "./gateways/http.js";
import { OpenAiAgent } from "@rieltordeals/worker";
import { CrmExtractor } from "./extraction.js";

async function main() {
  const envFile = fileURLToPath(new URL("../.env.local", import.meta.url));
  if (existsSync(envFile)) loadEnvFile(envFile);
  const config = readConfig(process.env);
  const gateway = config.mode === "demo"
    ? new (await import("./gateways/demo.js")).DemoCrmGateway()
    : new HttpCrmGateway(config.apiUrl!, config.apiToken!);
  const extractor = config.mode === "api"
    ? new CrmExtractor(new OpenAiAgent({ apiKey: config.openAiApiKey!, textModel: config.textModel!, transcriptionModel: config.transcriptionModel! }))
    : undefined;
  const { bot, close } = createBot(config, gateway, extractor);
  bot.catch(() => console.error("Telegram update failed; details omitted to protect credentials and client data."));
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      close();
      if (bot.isRunning()) void bot.stop().catch(() => undefined);
    });
  }
  console.log(`Roman bot starting in ${config.mode} mode.`);
  await bot.start({ allowed_updates: ["message", "callback_query"],
    onStart: () => console.log(JSON.stringify({ time: new Date().toISOString(), service: "bot", event: "polling.ready" })),
  });
}

main().catch(() => {
  console.error("Bot could not start. Check apps/bot/.env.local, access settings and network. Secrets are not logged.");
  process.exitCode = 1;
});
