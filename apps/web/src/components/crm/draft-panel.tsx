import Link from "next/link";
import { fieldBool, fieldString, type Card } from "@/lib/cards";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex h-9 items-center rounded-lg border border-border bg-muted/40 px-3 text-[13px] text-foreground">
        {value}
      </div>
    </label>
  );
}

export function DraftPanel({ card }: { card: Card | null }) {
  if (!card) {
    return (
      <aside className="w-full rounded-2xl border border-border bg-card p-5 shadow-[0_1px_2px_rgb(16_24_40_/_4%)] xl:w-[360px]">
        <h2 className="text-[15px] font-semibold text-foreground">
          Проверка черновика из Telegram
        </h2>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Когда менеджер пришлёт карточку в бота, черновик появится здесь.
        </p>
      </aside>
    );
  }

  return (
    <aside className="flex w-full flex-col rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40_/_4%)] xl:w-[360px]">
      <div className="border-b border-border/70 px-5 py-4">
        <h2 className="text-[15px] font-semibold text-foreground">
          Проверка черновика из Telegram
        </h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Проверьте данные и сохраните в CRM
        </p>
      </div>

      <div className="grid gap-4 px-5 py-4">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Основная информация
        </p>
        <Row label="ФИО собственника" value={card.name ?? "—"} />
        <Row label="Телефон" value={card.phone} />
        <div className="grid grid-cols-2 gap-3">
          <Row label="Тип объекта" value={card.objectType ?? "—"} />
          <Row label="Комнат" value={fieldString(card, "rooms") ?? "—"} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Площадь, м²" value={fieldString(card, "area") ?? "—"} />
          <Row label="Цена, ₽" value={fieldString(card, "price") ?? "—"} />
        </div>
        <Row label="Адрес" value={card.address ?? "—"} />

        <p className="pt-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Дополнительная информация
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Row
            label="Ипотека"
            value={fieldBool(card, "mortgage") ? "есть" : "нет"}
          />
          <Row
            label="Аресты / ограничения"
            value={fieldBool(card, "arrests") ? "есть" : "нет"}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Row
            label="Доли"
            value={fieldBool(card, "childrenShares") ? "есть" : "нет"}
          />
          <Row
            label="Один собственник"
            value={fieldString(card, "ownersCount") === "1" ? "да" : "нет"}
          />
        </div>
        <label className="grid gap-1.5">
          <span className="text-[11px] text-muted-foreground">Комментарий о клиенте</span>
          <div className="min-h-20 rounded-lg border border-border bg-muted/40 px-3 py-2 text-[13px] leading-5 text-foreground">
            {card.sourceText}
          </div>
        </label>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 border-t border-border/70 px-5 py-4">
        <Link
          href={`/crm/cards/${card.id}`}
          className="inline-flex h-9 items-center rounded-lg px-3 text-[13px] text-foreground/70 hover:bg-muted"
        >
          Отклонить
        </Link>
        <Link
          href={`/crm/cards/${card.id}`}
          className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[13px] text-foreground hover:bg-accent/70"
        >
          Нужны уточнения
        </Link>
        <Link
          href={`/crm/cards/${card.id}`}
          className="ml-auto inline-flex h-9 items-center rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"
        >
          Сохранить в CRM
        </Link>
      </div>
    </aside>
  );
}
