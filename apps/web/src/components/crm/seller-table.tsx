import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fieldString, formatDay, formatDue, type Card } from "@/lib/cards";
import { isBirthdaySoon } from "@/lib/birthday";
import { TemperatureControl } from "./card-status-controls";
import { dueTone } from "./status-tones";


function objectLine(card: Card) {
  const rooms = fieldString(card, "rooms");
  const area = fieldString(card, "area");
  const parts = [
    rooms ? `${rooms}-к` : card.objectType,
    card.address,
    area ? `${area} м²` : null,
  ].filter(Boolean);
  return parts.join(", ") || "—";
}

const heads = ["Собственник", "Объект / цена", "Температура", "Звонок"];

export function SellerTable({ cards }: { cards: Card[] }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Продавцы</h2>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">{cards.length}</span>
        </div>
        <Link
          href="/crm/cards/new?role=seller"
          aria-label="Добавить продавца"
          className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-accent"
        >
          + Добавить
        </Link>
      </div>
      <p className="px-5 pb-3 text-xs text-muted-foreground sm:hidden">Все поля доступны при прокрутке вправо →</p>
      <Table aria-label="Продавцы в обзоре" className="min-w-[500px]">
        <TableHeader className="bg-muted/50">
          <TableRow className="border-border/70 hover:bg-transparent">
            {heads.map((label) => (
              <TableHead
                key={label}
                scope="col"
                className="h-11 px-4 text-xs font-medium text-muted-foreground first:pl-5 last:pr-5"
              >
                {label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={heads.length} className="px-5 py-8 text-muted-foreground">
                Продавцов пока нет.
              </TableCell>
            </TableRow>
          ) : (
            cards.map((card) => (
              <TableRow key={card.id} className="border-border/60">
                <TableCell className="min-w-28 max-w-60 py-3 pr-4 pl-5 whitespace-normal">
                  <Link
                    href={`/crm/cards/${card.id}`}
                    className="text-sm font-medium break-words text-foreground underline-offset-4 hover:underline"
                  >
                    {card.name ?? card.phone}
                  </Link>
                  {isBirthdaySoon(card.birthday) && <p className="mt-1.5 text-xs text-muted-foreground">ДР: {formatDay(card.birthday)}</p>}
                </TableCell>
                <TableCell className="min-w-32 max-w-72 px-4 py-3 whitespace-normal">
                  <p className="text-sm font-medium tabular-nums">{fieldString(card, "price") ?? "-"}</p>
                  <p className="mt-1.5 text-xs leading-5 break-words text-muted-foreground">{objectLine(card)}</p>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <TemperatureControl card={card} />
                </TableCell>
                <TableCell className={`min-w-24 max-w-44 py-3 pr-5 pl-4 text-xs leading-5 whitespace-normal ${dueTone(formatDue(card.promisedCallAt))}`}>
                  {formatDue(card.promisedCallAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="border-t px-5 py-2">
        <Link href="/crm/sellers" className="inline-flex min-h-10 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline">
          Показать всех продавцов →
        </Link>
      </div>
    </section>
  );
}
