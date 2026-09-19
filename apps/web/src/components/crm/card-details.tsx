import { notFound } from "next/navigation";
import { CardForm } from "@/components/crm/card-form";
import { getCard } from "@/lib/cards";
import { StatusPill } from "@/components/crm/status-pill";
import Link from "next/link";
import { TaskComposer } from "@/components/crm/task-composer";
import { TaskEditor } from "@/components/crm/task-editor";
import { tasksFromCards } from "@/lib/tasks";
import { roleTone } from "@/components/crm/status-tones";

export async function CardDetails({ id, panel = false }: { id: string; panel?: boolean }) {

  let card;
  try {
    ({ card } = await getCard(id));
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
      {!panel && <Link href={card.role === "buyer" ? "/crm/buyers" : "/crm/sellers"} className="mb-5 inline-block text-sm text-muted-foreground hover:underline">← {card.role === "buyer" ? "Покупатели" : "Продавцы"}</Link>}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
            {card.name || card.phone}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{card.phone}</p>
        </div>
        <div className="flex gap-1.5">
          {card.tags.map((tag) => (
            <StatusPill key={tag} tone={roleTone(tag)}>
              {tag}
            </StatusPill>
          ))}
        </div>
      </div>
      <section id="tasks" className="my-6 space-y-4">
        <h2 className="text-lg font-semibold">Задачи по клиенту</h2>
        <TaskComposer cards={[{ id: card.id, name: card.name, phone: card.phone, role: card.role }]} />
        <TaskEditor card={card} tasks={tasksFromCards([card])} />
      </section>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(16_24_40_/_4%)]">
        <CardForm card={card} />
      </div>
    </div>
  );
}
