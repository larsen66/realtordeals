import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDay, type Card } from "@/lib/cards";
import { isBirthdaySoon } from "@/lib/birthday";
import { BuyerTasksSummary } from "./buyer-tasks-summary";

import {
  PaymentControl,
  StageControl,
  StageStatusControl,
  TemperatureControl,
} from "./card-status-controls";

const heads = ["Покупатель / задачи", "Температура", "Этап", "Статус этапа", "Бюджет / оплата"];

export function BuyerTable({ cards }: { cards: Card[] }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">Покупатели</h2>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">{cards.length}</span>
        </div>
        <Link
          href="/crm/cards/new?role=buyer"
          aria-label="Добавить покупателя"
          className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-accent"
        >
          + Добавить
        </Link>
      </div>
      <p className="px-5 pb-3 text-xs text-muted-foreground sm:hidden">Все поля доступны при прокрутке вправо →</p>
      <Table aria-label="Покупатели в обзоре" className="min-w-[500px]">
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
                Покупателей пока нет.
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
                  <div className="mt-2.5"><BuyerTasksSummary card={card} /></div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <TemperatureControl card={card} />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <StageControl card={card} />
                </TableCell>
                <TableCell className="px-4 py-3">
                  <StageStatusControl card={card} />
                </TableCell>
                <TableCell className="max-w-52 py-3 pr-5 pl-4 whitespace-normal">
                  <div className="flex flex-col items-start gap-1.5">
                    <span className="text-sm font-medium tabular-nums">{card.budget ?? "-"}</span>
                    <PaymentControl card={card} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="border-t px-5 py-2">
        <Link href="/crm/buyers" className="inline-flex min-h-10 items-center text-sm font-medium text-foreground underline-offset-4 hover:underline">
          Показать всех покупателей →
        </Link>
      </div>
    </section>
  );
}
