"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, Megaphone, Send, Store } from "lucide-react";
import { activityCounts, activityLabels, activityTypes, activityTimeZone, type Activity, type ActivityType } from "@rieltordeals/domain";
import { activityLocalTime, activityTimestamp, createActivity, updateActivity } from "@/lib/activities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "./status-pill";
import { pillTones } from "./status-tones";

const appearance = {
  flyers: { icon: Megaphone, tone: "green" },
  telegram: { icon: Send, tone: "blue" },
  promo_stand: { icon: Store, tone: "violet" },
} as const;
function when(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: activityTimeZone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function ActivityForm({ type, activity, onClose, onSaved }: { type: ActivityType; activity?: Activity; onClose: () => void; onSaved: (activity: Activity) => void }) {
  const router = useRouter();
  const [due, setDue] = useState(activity ? activityLocalTime(activity.scheduledAt) : "");
  const [notes, setNotes] = useState(activity?.notes ?? "");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    startTransition(async () => {
      try {
        const input = { type, scheduledAt: activityTimestamp(due), notes };
        const result = activity ? await updateActivity(activity, { scheduledAt: input.scheduledAt, notes }) : await createActivity(input);
        onSaved(result.activity);
        router.refresh(); onClose();
      } catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить активность"); }
    });
  }
  return <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl border bg-card p-4" aria-label={`${activity ? "Изменить" : "Запланировать"}: ${activityLabels[type]}`}>
    <label className="grid gap-1.5 text-sm">Дата и время (МСК)
      <Input type="datetime-local" required value={due} onChange={e => setDue(e.target.value)} disabled={pending} />
    </label>
    <label className="grid gap-1.5 text-sm">Комментарий
      <Textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={5000} placeholder="Место, площадка или детали активности" disabled={pending} />
    </label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button disabled={pending}>{pending ? "Сохраняю…" : "Сохранить"}</Button>
      <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Отмена</Button>
    </div>
  </form>;
}

function ActivityRow({ activity, onSaved }: { activity: Activity; onSaved: (activity: Activity) => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const done = Boolean(activity.completedAt);
  function toggle() {
    setError("");
    startTransition(async () => {
      try { const result = await updateActivity(activity, { completed: !done }); onSaved(result.activity); router.refresh(); }
      catch (err) { setError(err instanceof Error ? err.message : "Не удалось изменить активность"); }
    });
  }
  return <li className="border-t p-4 sm:px-5" data-activity-id={activity.id}>
    <div className="grid items-start gap-4 lg:grid-cols-[190px_210px_minmax(0,1fr)_auto]">
      <div className="space-y-2">
        <p className="text-sm font-medium">{activityLabels[activity.type]}</p>
        <StatusPill tone={done ? "green" : "blue"}>{done ? "Выполнено" : "Запланировано"}</StatusPill>
      </div>
      <div className="text-sm">
        <p>{when(activity.scheduledAt)}</p>
        {activity.completedAt && <p className="mt-1 text-xs text-muted-foreground">Выполнено: {when(activity.completedAt)}</p>}
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{activity.notes || "Без комментария"}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={done ? "outline" : "default"} disabled={pending || editing} onClick={toggle}>
          {!done && <Check className="size-3.5" />}{pending ? "Сохраняю…" : done ? "Вернуть в план" : "Выполнено"}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing(!editing)} aria-expanded={editing}>Изменить</Button>
      </div>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    {editing && <ActivityForm key={activity.updatedAt} type={activity.type} activity={activity} onClose={() => setEditing(false)} onSaved={onSaved} />}
  </li>;
}

export function ActivitiesBoard({ activities, initialNow }: { activities: Activity[]; initialNow: string }) {
  const [items, setItems] = useState(activities);
  const [synced, setSynced] = useState(activities);
  if (activities !== synced) { setSynced(activities); setItems(activities); }
  function onSaved(activity: Activity) {
    setItems(current => [...current.filter(item => item.id !== activity.id), activity]);
  }
  const [openType, setOpenType] = useState<ActivityType | null>(null);
  const [filter, setFilter] = useState<"planned" | "completed" | "all">("planned");
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date().toISOString()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const counts = activityCounts(items, new Date(now));
  const month = new Intl.DateTimeFormat("ru-RU", { timeZone: activityTimeZone, month: "long", year: "numeric" }).format(new Date(now));
  const visible = items.filter(a => filter === "all" || (filter === "completed" ? a.completedAt : !a.completedAt))
    .sort((a, b) => filter === "completed"
      ? Date.parse(b.completedAt!) - Date.parse(a.completedAt!)
      : Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  return <div className="space-y-6">
    <div className="grid items-start gap-4 xl:grid-cols-3">
      {activityTypes.map(type => {
        const { icon: Icon, tone } = appearance[type];
        return <section key={type} className="rounded-2xl border bg-card p-5" aria-label={activityLabels[type]}>
          <div className="flex items-center gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${pillTones[tone]}`}><Icon aria-hidden className="size-5" /></span>
            <h2 className="font-semibold">{activityLabels[type]}</h2>
          </div>
          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tabular-nums" data-month-count={type}>{counts[type]}</span>
            <span className="text-sm text-muted-foreground">выполнено за месяц</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{month}</p>
          <Button className="mt-5 w-full" variant="outline" onClick={() => setOpenType(openType === type ? null : type)} aria-expanded={openType === type}>
            <CalendarDays className="size-4" />Запланировать
          </Button>
          {openType === type && <ActivityForm type={type} onClose={() => setOpenType(null)} onSaved={onSaved} />}
        </section>;
      })}
    </div>
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
        <h2 className="font-semibold">План и история активностей</h2>
        <div className="flex flex-wrap gap-2" aria-label="Фильтр активностей">
          {([ ["planned", "Запланировано"], ["completed", "Выполнено"], ["all", "Все"] ] as const).map(([value, label]) =>
            <Button key={value} size="sm" variant={filter === value ? "default" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}
        </div>
      </div>
      {!visible.length ? <p className="border-t px-5 py-10 text-center text-sm text-muted-foreground">{filter === "completed" ? "Пока нет выполненных активностей. Отметьте выполнение в плане — счётчик обновится." : "Активностей пока нет. Выберите нужный вид выше и запланируйте дату."}</p>
        : <ul>{visible.map(activity => <ActivityRow key={activity.id} activity={activity} onSaved={onSaved} />)}</ul>}
    </section>
    <p className="text-xs text-muted-foreground">Счётчики учитывают дату отметки «Выполнено». Даты и границы месяца — по московскому времени.</p>
  </div>;
}
