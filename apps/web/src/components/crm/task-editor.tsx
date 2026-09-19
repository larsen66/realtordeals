"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiJson } from "@/lib/api";
import { toDateTimeLocal, updateCard, type Card } from "@/lib/cards";
import { completePromisedCall, createTask, type Task } from "@/lib/tasks";
import { StageControl, StageStatusControl } from "./card-status-controls";

export function TaskEditor({ card, tasks }: { card: Card; tasks: Task[] }) {
  return (
    <div className="space-y-3">
      {card.role === "buyer" && (
        <div className="flex flex-wrap gap-5 rounded-lg border bg-card p-4">
          <div className="space-y-2"><p className="text-xs text-muted-foreground">Этап клиента</p><StageControl card={card} /></div>
          {(card.stage === "selection" || card.stage === "referral") && <div className="space-y-2"><p className="text-xs text-muted-foreground">Статус этапа</p><StageStatusControl card={card} /></div>}
        </div>
      )}
      {tasks.map((task) => <TaskEdit key={`${task.id}:${card.updatedAt}`} task={task} />)}
      {!tasks.length && <p className="text-sm text-muted-foreground">Задач пока нет.</p>}
    </div>
  );
}

function TaskEdit({ task }: { task: Task }) {
  const router = useRouter();
  const [status, setStatus] = useState(task.completedAt ? "completed" : "open");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const due = new FormData(event.currentTarget).get("dueAt")?.toString() ?? "";
    setPending(true); setError(""); setSaved(false);
    try {
      const dueAt = due ? new Date(due).toISOString() : null;
      if (task.kind === "call") {
        if (status === "completed") await completePromisedCall(task.cardId, task.dueAt);
        else {
          if (!dueAt) throw new Error("Укажите срок обещанного звонка");
          await updateCard(task.cardId, { promisedCallAt: dueAt });
        }
      } else if (task.kind === "selection") {
        if (status === "completed") {
          await updateCard(task.cardId, { selectionStatus: "awaiting_reply" });
        } else if (dueAt) {
          await createTask(task.cardId, { type: "selection", title: task.title, notes: task.notes, dueAt });
        }
      } else {
        await apiJson(`/cards/${task.cardId}/tasks/${task.id}`, {
          method: "PATCH", body: JSON.stringify({ dueAt, completed: status === "completed" }),
        });
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить задачу");
    } finally { setPending(false); }
  }

  return (
    <form onSubmit={save} aria-label={`Редактировать: ${task.title}`} className="space-y-3 rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">{task.title}</p>
      <fieldset disabled={pending} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1.5 text-xs text-muted-foreground">Срок
          <Input name="dueAt" type="datetime-local" defaultValue={toDateTimeLocal(task.dueAt)} disabled={status === "completed" && task.kind !== "stored"} className="text-foreground" />
        </label>
        <label className="grid gap-1.5 text-xs text-muted-foreground">Статус
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border bg-card px-2 text-sm text-foreground">
            <option value="open">В работе</option>
            <option value="completed">{task.kind === "selection" ? "Подборка отправлена, ждём ответ" : "Выполнена"}</option>
          </select>
        </label>
        <Button type="submit" size="sm">{pending ? "Сохраняю…" : "Сохранить"}</Button>
      </fieldset>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      {saved && <p role="status" className="text-xs text-muted-foreground">Сохранено</p>}
    </form>
  );
}
