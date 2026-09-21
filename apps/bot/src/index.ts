import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { readConfig } from "./config.js";
import { createUsageLog } from "./usage.js";
import { registerMenu } from "./menu.js";
import { setupBot } from "./setup.js";

async function main() {
  const envFile = fileURLToPath(new URL("../.env.local", import.meta.url));
  if (existsSync(envFile)) loadEnvFile(envFile);
  const config = readConfig(process.env);
  const usage = config.mode === "api" ? createUsageLog(fileURLToPath(new URL("../.data/openai-usage.jsonl", import.meta.url)), config.openAiApiKey!) : undefined;
  const { bot, close } = await setupBot(config, usage);
  await registerMenu(bot);
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
