"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Handshake, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DealDays = Record<string, number>;
const STORAGE_KEY = "crm-deal-days";
const monthNow = () => new Date().toISOString().slice(0, 7);
const monthLabel = (value: string) => new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`));
const dateKey = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;

export default function FinanceDealsPage() {
  const [month, setMonth] = useState(monthNow);
  const [deals, setDeals] = useState<DealDays>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      if (parsed && typeof parsed === "object") setDeals(parsed as DealDays);
    } catch { /* local-only data is optional */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
  }, [deals, hydrated]);

  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const firstDay = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, index) => index + 1), [daysInMonth]);
  const total = days.reduce((sum, day) => sum + (deals[dateKey(month, day)] ?? 0), 0);
  const markedDays = days.filter((day) => (deals[dateKey(month, day)] ?? 0) > 0).length;

  function shiftMonth(delta: number) {
    const next = new Date(year, monthNumber - 1 + delta, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  }

  function changeDay(day: number, delta: number) {
    const key = dateKey(month, day);
    setDeals((current) => {
      const next = { ...current, [key]: Math.max(0, (current[key] ?? 0) + delta) };
      if (next[key] === 0) delete next[key];
      return next;
    });
  }

  return <main className="w-full space-y-7 px-4 py-7 sm:px-8">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><Link href="/crm/finances" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Финансы</Link><h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight"><Handshake className="size-6 text-primary" />Сделки</h1><p className="mt-2 text-sm text-muted-foreground">Отмечайте количество сделок по датам — отмеченные дни подсвечиваются зелёным.</p></div>
      <div className="flex items-center gap-2 rounded-lg border bg-card p-1"><button type="button" onClick={() => shiftMonth(-1)} className="grid size-9 place-items-center rounded-md hover:bg-accent" aria-label="Предыдущий месяц"><ChevronLeft className="size-4" /></button><span className="min-w-36 text-center text-sm font-medium capitalize">{monthLabel(month)}</span><button type="button" onClick={() => shiftMonth(1)} className="grid size-9 place-items-center rounded-md hover:bg-accent" aria-label="Следующий месяц"><ChevronRight className="size-4" /></button></div>
    </header>
    <section className="rounded-2xl border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted-foreground">Сделок за месяц</p><p className="mt-1 text-3xl font-semibold tabular-nums">{total}</p></div><p className="text-sm text-muted-foreground">Отмечено дней: <span className="font-semibold text-foreground">{markedDays}</span></p></div><div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">{["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => <div key={day} className="py-2">{day}</div>)}{Array.from({ length: firstDay }, (_, index) => <div key={`empty-${index}`} />)}{days.map((day) => { const count = deals[dateKey(month, day)] ?? 0; return <div key={day} className={`min-h-24 rounded-xl border p-2 transition-colors ${count > 0 ? "border-emerald-500/40 bg-emerald-500/15" : "bg-muted/20"}`}><div className="text-left text-sm font-medium">{day}</div><div className="mt-2 flex items-center justify-center gap-1"><button type="button" onClick={() => changeDay(day, -1)} disabled={!count} className="grid size-7 place-items-center rounded-md border bg-card text-muted-foreground hover:bg-accent disabled:opacity-30" aria-label={`Уменьшить сделки за ${day} число`}><Minus className="size-3" /></button><span className={`min-w-7 text-center text-lg font-semibold tabular-nums ${count > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground"}`}>{count}</span><button type="button" onClick={() => changeDay(day, 1)} className="grid size-7 place-items-center rounded-md border bg-card text-muted-foreground hover:bg-accent" aria-label={`Добавить сделку за ${day} число`}><Plus className="size-3" /></button></div></div>; })}</div></section>
  </main>;
}
