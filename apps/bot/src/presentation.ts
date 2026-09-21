import { InlineKeyboard } from "grammy";
import type { Draft } from "./contract.js";

export const roleKeyboard = () => new InlineKeyboard()
  .text("Покупатель", "new:buyer").text("Продавец", "new:seller");

export function reviewKeyboard(draft: Draft): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (draft.canConfirm && draft.status === "ready") {
    kb.text("Сохранить", `ok:${draft.id}:${draft.revision}`).row();
  }
  if (draft.status !== "confirmed") {
    kb.text("Изменить", `fix:${draft.id}:${draft.revision}`).row();
    kb.text("Обновить", `show:${draft.id}`);
  }
  return kb;
}

export function renderDraft(draft: Draft, demo: boolean): string[] {
  const lines: string[] = [];
  if (demo) lines.push("ДЕМО — без OpenAI и записи в CRM. Данные исчезнут после перезапуска.");
  lines.push(`${draft.role === "buyer" ? "Покупатель" : "Продавец"} · черновик ${draft.id} · версия ${draft.revision}`);
  if (draft.targetCardId) lines.push(`Редактирование CRM: ${draft.targetCardId}`);
  lines.push("Обязателен только телефон. Остальные поля можно не заполнять.");
  for (const field of draft.fields) lines.push(`${field.label}: ${field.value ?? "Не выяснено"}`);
  if (draft.notes.length) lines.push("Примечания:", ...draft.notes);
  if (draft.issues.length) lines.push("Нужно уточнить:", ...draft.issues.map((issue) => `• ${issue}`));
  if (draft.status === "processing") lines.push("Сообщение принято бэкендом. Идет обработка. Результат появится здесь; проверить вручную: /draft.");
  else if (draft.status === "confirmed") lines.push(demo
    ? "Подтверждение проверено в деморежиме. В CRM ничего не отправлено."
    : `Сохранено в CRM. Карточка: ${draft.cardId}`);
  else if (draft.canConfirm) lines.push("Проверьте все поля. Всё ли верно?");
  else lines.push("Пришлите текст или голос, чтобы дополнить данные. Для сохранения укажите телефон.");

  // Preserve every field. Plain text avoids Telegram HTML/Markdown injection.
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    const points = [...line];
    while (points.length) {
      const part = points.splice(0, 1700).join(""); // also bounded in UTF-16 units
      if (current.length + part.length + 1 > 3500) { chunks.push(current); current = ""; }
      current += (current ? "\n" : "") + part;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
