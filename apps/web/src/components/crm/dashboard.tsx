import Link from "next/link";
import { BuyerTable } from "./buyer-table";
import { SellerTable } from "./seller-table";
import { TaskTable } from "./task-table";
import type { Card } from "@/lib/cards";
import { filterTasks, tasksFromCards, type TaskTab } from "@/lib/tasks";

const tabs = [
  { id: "all", label: "Все" },
  { id: "today", label: "Сегодня" },
  { id: "selection", label: "Подборки" },
  { id: "viewing", label: "Показы" },
] as const;

export function Dashboard({ cards, tab = "all" }: { cards: Card[]; tab?: string }) {
  const tasks = tasksFromCards(cards);
  const buyers = cards.filter((card) => card.role === "buyer");
  const sellers = cards.filter((card) => card.role === "seller");
  const openTasks = filterTasks(tasks, "all");
  const selected: TaskTab = tabs.find((item) => item.id === tab)?.id ?? "all";
  const filteredTasks = filterTasks(tasks, selected);
  const previewTasks = filteredTasks.slice(0, 5);

  return <main className="space-y-6 p-4 md:p-6 lg:p-8">
    <h1 className="sr-only">Обзор CRM</h1>
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <nav aria-label="Фильтр задач" className="grid w-full grid-cols-2 gap-1 sm:flex sm:w-auto sm:flex-wrap">
          {tabs.map((item) => (
            <Link key={item.id} href={item.id === "all" ? "/crm" : `/crm?tab=${item.id}`}
              aria-current={selected === item.id ? "page" : undefined}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium ${selected === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
              {item.label} <span className="tabular-nums">{filterTasks(tasks, item.id).length}</span>
            </Link>
          ))}
        </nav>
        <Link href="/crm/tasks" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-foreground hover:underline">Все задачи <span className="text-muted-foreground tabular-nums">{openTasks.length}</span><span aria-hidden="true">↗</span></Link>
      </div>
      <p className="border-b px-5 py-2 text-xs text-muted-foreground sm:hidden">Прокрутите таблицу вправо, чтобы увидеть все поля →</p>
      <TaskTable tasks={previewTasks} />
      {filteredTasks.length > previewTasks.length && (
        <div className="border-t px-5 py-3 text-xs text-muted-foreground">
          Показано {previewTasks.length} из {filteredTasks.length}. Остальные задачи доступны в полном списке.
        </div>
      )}
    </section>
    <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
      <SellerTable cards={sellers} />
      <BuyerTable cards={buyers} />
    </div>
  </main>;
}
