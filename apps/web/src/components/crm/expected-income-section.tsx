"use client";

import { CircleDollarSign, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Source = "Рилс" | "ЮСИ" | "ХАСБЕНД";
type ExpectedIncomeItem = { id: string; source: Source; amount: number; date: string; received: boolean };

const STORAGE_KEY = "crm-expected-income-v1";
const sources: Source[] = ["Рилс", "ЮСИ", "ХАСБЕНД"];
const formatAmount = (amount: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(amount);

export function ExpectedIncomeSection() {
  const [items, setItems] = useState<ExpectedIncomeItem[]>([]);
  const [source, setSource] = useState<Source>("Рилс");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setItems(JSON.parse(saved) as ExpectedIncomeItem[]);
    } catch {
      // Keep the section usable when browser storage is unavailable.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const pending = useMemo(() => items.filter((item) => !item.received), [items]);
  const pendingTotal = pending.reduce((sum, item) => sum + item.amount, 0);

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !date) return;
    setItems((current) => [{ id: crypto.randomUUID(), source, amount: parsedAmount, date, received: false }, ...current]);
    setAmount("");
    setDate("");
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="font-semibold">Ожидаемые доходы</h2><p className="mt-1 text-sm text-muted-foreground">Добавьте деньги, которые вам должны. Галочка означает, что деньги уже получены.</p></div>
        <div className="text-right"><p className="text-xs text-muted-foreground">Ещё жду</p><p className="text-2xl font-semibold tabular-nums">{formatAmount(pendingTotal)} ₽</p></div>
      </div>
      <form onSubmit={addItem} className="mt-5 grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-[200px_1fr_170px_auto] sm:items-end">
        <label className="grid gap-1.5 text-sm">Источник<select value={source} onChange={(event) => setSource(event.target.value as Source)} className="h-10 rounded-md border bg-card px-3">{sources.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm">Сумма, ₽<input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Например, 150000" className="h-10 rounded-md border bg-card px-3" /></label>
        <label className="grid gap-1.5 text-sm">Дата<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-md border bg-card px-3" /></label>
        <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="size-4" />Добавить</button>
      </form>
      <div className="mt-5 space-y-2">
        {items.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Ожидаемых доходов пока нет.</p> : items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div className="flex items-center gap-3"><span className={`grid size-9 place-items-center rounded-lg ${item.received ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}><CircleDollarSign className="size-4" /></span><div><p className="font-medium">{item.source}</p><p className="text-xs text-muted-foreground">{item.date}</p></div></div><div className="flex items-center gap-3"><span className="font-semibold tabular-nums">{formatAmount(item.amount)} ₽</span><label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={item.received} onChange={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, received: !entry.received } : entry))} className="size-4 accent-emerald-600" />{item.received ? "Получено" : "Ещё жду"}</label><button type="button" aria-label={`Удалить ожидаемый доход ${item.source}`} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="size-4" /></button></div></div>)}
      </div>
    </section>
  );
}
