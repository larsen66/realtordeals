import Link from "next/link";
import type { Card } from "@/lib/cards";
import { filterTasks, tasksFromCards } from "@/lib/tasks";

export function BuyerTasksSummary({ card }: { card: Card }) {
  const tasks = filterTasks(tasksFromCards([card]), "all");
  const href = `/crm/cards/${card.id}#tasks`;

  if (!tasks.length) {
    return <p className="text-xs text-muted-foreground">Нет активных задач</p>;
  }

  return (
    <div className="min-w-44 max-w-64 space-y-2 whitespace-normal">
      <ul aria-label={`Активные задачи: ${card.name || card.phone}`} className="space-y-2">
        {tasks.slice(0, 2).map((task) => (
          <li key={task.id}>
            <Link href={href} className="group flex items-start gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span aria-hidden="true" className={`mt-1.5 size-1.5 shrink-0 rounded-full ${task.overdue ? "bg-destructive" : "bg-muted-foreground/60"}`} />
              <span className="min-w-0">
                <span className="block text-xs leading-4 break-words text-foreground/90 underline-offset-4 group-hover:underline">{task.title}</span>
                {task.dueAt && (
                  <time dateTime={task.dueAt} className={`mt-0.5 block text-[11px] leading-4 ${task.overdue ? "text-destructive" : "text-muted-foreground"}`}>
                    {task.overdue ? "Просрочено · " : ""}{task.dueLabel}
                  </time>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {tasks.length > 2 && (
        <Link href={href} className="inline-block rounded-sm text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring">
          Ещё {tasks.length - 2} →
        </Link>
      )}
    </div>
  );
}
