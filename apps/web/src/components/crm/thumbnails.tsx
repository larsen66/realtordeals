import {
  paymentLabels,
  stageLabels,
  temperatureLabels,
} from "@rieltordeals/domain";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDay, formatWhen, type Card } from "@/lib/cards";
import { isBirthdaySoon } from "@/lib/birthday";

function dash(value: string | null | undefined) {
  return value?.trim() ? value : "—";
}

export function SellerThumbnails({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return <Empty text="Продавцов пока нет." />;
  }

  return (
    <ul className="grid gap-3">
      {cards.map((card) => (
        <li key={card.id}>
          <Link
            href={`/crm/cards/${card.id}`}
            className="block rounded-md border border-border bg-card/80 px-4 py-3 transition-colors hover:bg-card"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-heading text-lg">{dash(card.name)}</p>
              <p className="text-sm text-muted-foreground">{card.phone}</p>
            </div>
            <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
              <Item label="Тип" value={dash(card.objectType)} />
              <Item label="Адрес" value={dash(card.address)} />
              {isBirthdaySoon(card.birthday) && <Item label="ДР" value={formatDay(card.birthday)} />}
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              Перезвонить до {formatWhen(card.promisedCallAt)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function BuyerThumbnails({ cards }: { cards: Card[] }) {
  if (cards.length === 0) {
    return <Empty text="Покупателей пока нет." />;
  }

  return (
    <ul className="grid gap-3">
      {cards.map((card) => (
        <li key={card.id}>
          <Link
            href={`/crm/cards/${card.id}`}
            className="block rounded-md border border-border bg-card/80 px-4 py-3 transition-colors hover:bg-card"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-heading text-lg">{dash(card.name)}</p>
              <p className="text-sm text-muted-foreground">{card.phone}</p>
            </div>
            <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-3">
              <Item label="Источник" value={dash(card.source)} />
              <Item label="Бюджет" value={dash(card.budget)} />
              <Item label="Тип объекта" value={dash(card.objectType)} />
              {isBirthdaySoon(card.birthday) && <Item label="ДР" value={formatDay(card.birthday)} />}
            </dl>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {card.temperature ? (
                <Badge
                  variant={card.temperature === "hot" ? "destructive" : "outline"}
                >
                  {temperatureLabels[card.temperature]}
                </Badge>
              ) : null}
              {card.payment.map((payment) => (
                <Badge key={payment} variant="secondary">{paymentLabels[payment]}</Badge>
              ))}
              {card.stage ? (
                <Badge variant="outline">{stageLabels[card.stage]}</Badge>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Перезвонить до {formatWhen(card.promisedCallAt)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.65rem] tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
      {text}
    </p>
  );
}
