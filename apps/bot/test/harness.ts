import type { InlineKeyboardMarkup, Update, UserFromGetMe } from "grammy/types";
import { createBot } from "../src/bot.js";
import type { CrmGateway } from "../src/contract.js";

export const actor = { telegramUserId: 42, chatId: 42 };
export function harness(gateway: CrmGateway) {
  const runtime = createBot({ mode: gateway.mode, token: "123456:offline-test-only", allowedUserIds: new Set([42]),
    maxVoiceBytes: 10 * 1024 * 1024, maxVoiceSeconds: 300 }, gateway);
  const botUser: UserFromGetMe = { id: 123456, is_bot: true, first_name: "Roman test", username: "roman_test_bot",
    can_join_groups: false, can_read_all_group_messages: false, supports_inline_queries: false, can_connect_to_business: false,
    has_main_web_app: false, has_topics_enabled: false, allows_users_to_create_topics: false,
    can_manage_bots: false, supports_join_request_queries: false };
  runtime.bot.botInfo = botUser;
  const sent: { method: string; text?: string; reply_markup?: InlineKeyboardMarkup }[] = [];
  runtime.bot.api.config.use(async (_previous, method, payload) => {
    const data = payload as { text?: string; reply_markup?: InlineKeyboardMarkup };
    sent.push({ method, ...data });
    // No requests reach Telegram. Only methods exercised by this transport are allowed.
    if (method === "sendMessage") return { ok: true, result: { message_id: sent.length + 100, date: 1,
      chat: { id: 42, type: "private" }, from: botUser, text: data.text } } as never;
    if (method === "answerCallbackQuery") return { ok: true, result: true } as never;
    throw new Error(`Unexpected Telegram operation: ${method}`);
  });
  let sequence = 1;
  const user = (id: number) => ({ id, is_bot: false, first_name: "Test" });
  return {
    ...runtime, sent,
    text: async (text: string, userId = 42, updateId = sequence++, group = false) => {
      const update: Update = { update_id: updateId, message: { message_id: updateId, date: 1,
        chat: group ? { id: -42, type: "group", title: "Test group" } : { id: userId, type: "private", first_name: "Test" },
        from: user(userId), text,
        ...(text.startsWith("/") ? { entities: [{ type: "bot_command" as const, offset: 0, length: text.split(" ")[0]!.length }] } : {}) } };
      await runtime.bot.handleUpdate(update);
    },
    click: async (data: string, userId = 42, messageId = 100) => {
      const n = sequence++;
      await runtime.bot.handleUpdate({ update_id: n, callback_query: { id: String(n), from: user(userId),
        chat_instance: "offline", data, message: { message_id: messageId, date: 1, from: botUser,
          chat: { id: userId, type: "private", first_name: "Test" }, text: "Review" } } });
    },
    voice: async (duration = 30) => {
      const n = sequence++;
      await runtime.bot.handleUpdate({ update_id: n, message: { message_id: n, date: 1,
        chat: { id: 42, type: "private", first_name: "Test" }, from: user(42),
        voice: { file_id: "fake-telegram-file", file_unique_id: "fake-unique", duration, file_size: 512, mime_type: "audio/ogg" } } });
    },
    output: () => sent.filter((s) => s.method === "sendMessage").map((s) => s.text).join("\n"),
  };
}
