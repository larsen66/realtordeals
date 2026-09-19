import Link from "next/link";
import { firstParam, listCards } from "@/lib/cards";
import { filterTasks, isTaskTab, taskTabs, tasksFromCards } from "@/lib/tasks";
import { TaskTable } from "./task-table";
import { TaskComposer } from "./task-composer";

export async function WorkList({ params, reminders = false }: {
  params: Record<string, string | string[] | undefined>; reminders?: boolean;
}) {
  const path = reminders ? "/crm/reminders" : "/crm/tasks";
  const title = reminders ? "Напоминания" : "Задачи";
  let cards;
  try { ({ cards } = await listCards()); }
  catch { return <main className="p-6"><h1 className="text-2xl font-semibold">{title}</h1><p role="alert" className="mt-4 text-sm text-destructive">Не удалось загрузить задачи. Проверьте подключение и обновите страницу.</p></main>; }
  const rawTab = firstParam(params.tab);
  const tab = isTaskTab(rawTab) ? rawTab : "all";
  const query = firstParam(params.q) ?? "";
  const tasks = tasksFromCards(cards).filter((task) => (!reminders || task.dueAt) &&
    [task.title, task.client, task.phone, task.notes, task.request].join(" ").toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")));
  const tabs = reminders ? taskTabs.filter((item) => ["all", "today", "overdue", "call", "completed"].includes(item.id)) : taskTabs;
  return <main className="space-y-6 p-4 md:p-6">
    <header><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{reminders ? "Обещанные звонки и задачи со сроком" : "Подбор вариантов, показы, ипотека и работа с клиентами"}</p></header>
    <TaskComposer cards={cards.map(({ id, name, phone, role }) => ({ id, name, phone, role }))} />
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <form action={path} className="flex flex-wrap items-end gap-3 border-b p-5">
        <input type="hidden" name="tab" value={tab} />
        <label className="grid flex-1 gap-1.5 text-xs text-muted-foreground">Поиск по задачам<input name="q" defaultValue={query} placeholder="Клиент, телефон или задача" className="h-10 min-w-0 rounded-lg border bg-card px-3 text-sm text-foreground" /></label>
        <button className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">Найти</button>
        {query && <Link href={path} className="py-2 text-sm text-muted-foreground">Сбросить</Link>}
      </form>
      <nav aria-label="Фильтр задач" className="flex flex-wrap gap-2 border-b p-4">{tabs.map((item) => {
        const filters = new URLSearchParams({ tab: item.id }); if (query) filters.set("q", query);
        return <Link href={`${path}?${filters}`} key={item.id} aria-current={item.id === tab ? "page" : undefined} className={`rounded-lg px-3 py-2 text-xs ${item.id === tab ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent"}`}>{item.label} <span className="ml-1 opacity-70">{filterTasks(tasks, item.id).length}</span></Link>;
      })}</nav>
      <TaskTable tasks={filterTasks(tasks, tab)} />
    </section>
  </main>;
}
