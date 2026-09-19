export type BotConfig = {
  mode: "demo" | "api";
  token: string;
  allowedUserIds: ReadonlySet<number>;
  apiUrl?: string;
  apiToken?: string;
  maxVoiceBytes: number;
  maxVoiceSeconds: number;
};

export function readConfig(env: NodeJS.ProcessEnv): BotConfig {
  const mode = env.BOT_MODE;
  if (mode !== "demo" && mode !== "api") throw new Error("Set BOT_MODE=demo or api");
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !/^\d+:[\w-]+$/.test(token)) throw new Error("Set TELEGRAM_BOT_TOKEN");
  const ids = (env.TELEGRAM_ALLOWED_USER_IDS ?? "").split(",").map((s) => s.trim());
  if (!ids.length || ids.some((s) => !/^\d+$/.test(s) || !Number.isSafeInteger(Number(s)) || Number(s) <= 0)) {
    throw new Error("Set TELEGRAM_ALLOWED_USER_IDS to positive numeric IDs");
  }
  const limit = (name: string, fallback: number) => {
    const n = Number(env[name] ?? fallback);
    if (!Number.isSafeInteger(n) || n <= 0) throw new Error(`Invalid ${name}`);
    return n;
  };
  const config: BotConfig = {
    mode, token, allowedUserIds: new Set(ids.map(Number)),
    maxVoiceBytes: limit("BOT_MAX_VOICE_BYTES", 10 * 1024 * 1024),
    maxVoiceSeconds: limit("BOT_MAX_VOICE_SECONDS", 300),
  };
  if (mode === "api") {
    const base = env.CRM_API_URL?.trim();
    if (!base) throw new Error("Set CRM_API_URL");
    let url: URL;
    try { url = new URL(base); } catch { throw new Error("Invalid CRM_API_URL"); }
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && local)) || url.username || url.password || url.search || url.hash) {
      throw new Error("CRM_API_URL must use HTTPS (HTTP only on localhost), without credentials/query");
    }
    const secret = env.CRM_API_TOKEN?.trim();
    if (!secret) throw new Error("Set CRM_API_TOKEN");
    config.apiUrl = base.replace(/\/$/, "");
    config.apiToken = secret;
  }
  return config;
}
