"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { taskTypeLabels, type TaskType } from "@rieltordeals/domain";
import { createTask } from "@/lib/tasks";
import type { Card } from "@/lib/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function TaskComposer({ cards, expanded = false }: { cards: Pick<Card, "id" | "name" | "phone" | "role">[]; expanded?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(expanded);
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const [type, setType] = useState<TaskType>("other");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [due, setDue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const seller = cards.find((card) => card.id === cardId)?.role === "seller";
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    try {
      await createTask(cardId, { type, title: title || taskTypeLabels[type], notes, dueAt: due ? new Date(due).toISOString() : null });
      setTitle(""); setNotes(""); setDue(""); setOpen(false); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Не удалось создать задачу"); }
    finally { setPending(false); }
  }
  if (!cards.length) return <p className="text-sm text-muted-foreground">Сначала добавьте покупателя или продавца, чтобы назначить задачу.</p>;
  return <div>
    <Button type="button" variant={open ? "outline" : "default"} onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Закрыть" : "+ Добавить задачу"}</Button>
    {open && <form onSubmit={submit} className="mt-4 grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm">Клиент<select className="h-10 rounded-md border bg-card px-3" value={cardId} onChange={(event) => { setCardId(event.target.value); setType("other"); }} required>{cards.map((card) => <option value={card.id} key={card.id}>{card.name || card.phone} · {card.phone}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm">Тип задачи<select className="h-10 rounded-md border bg-card px-3" value={type} onChange={(event) => { setType(event.target.value as TaskType); setTitle(""); }}>{Object.entries(taskTypeLabels).filter(([key]) => !seller || key === "call" || key === "other").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm">Название<Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={taskTypeLabels[type]} maxLength={200} required={type === "other"} /></label>
      <label className="grid gap-1.5 text-sm">Срок<Input type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} /></label>
      <label className="grid gap-1.5 text-sm sm:col-span-2">Подробности<Textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={5000} placeholder="Что сделать, какие документы или варианты подготовить" /></label>
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <Button disabled={pending} className="justify-self-start">{pending ? "Сохраняю…" : "Создать задачу"}</Button>
    </form>}
  </div>;
}
