"use client";

import { CircleDollarSign, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Source = "Рилс" | "ЮСИ" | "ХАСБЕНД";

type ExpectedIncomeItem = {
  id: string;
  source: Source;
  amount: number;
  date: string;
  received: boolean;
};

const STORAGE_KEY = "crm-expected-income-v1";
const sources: Source[] = ["Рилс", "ЮСИ", "ХАСБЕНД"];

const formatAmount = (amount: number) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(amount);

export function ExpectedIncome() {
  const [items, setItems] = useState<ExpectedIncomeItem[]>([]);
  const [source, setSource] = useState<Source>("Рилс");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate browser-only records after SSR.
      if (saved) setItems(JSON.parse(saved) as ExpectedIncomeItem[]);
    } catch {
      // Keep the page usable when browser storage is unavailable.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const pending = useMemo(() => items.filter((item) => !item.received), [items]);
  const pendingTotal = pending.reduce((sum, item) => sum + item.amount, 0);
  const receivedTotal = items
    .filter((item) => item.received)
    .reduce((sum, item) => sum + item.amount, 0);

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !date) return;

    setItems((current) => [
      {
        id: crypto.randomUUID(),
        source,
        amount: parsedAmount,
        date,
        received: false,
      },
      ...current,
    ]);
    setAmount("");
    setDate("");
  }

  return (
    <main className="space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Финансы</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Ожидаемые доходы</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Записывайте деньги, которые вам должны. Пока галочка не установлена, сумма считается ожидаемой.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Жду" value={pendingTotal} tone="warning" />
        <SummaryCard label="Получено" value={receivedTotal} tone="success" />
        <SummaryCard label="Всего записано" value={pendingTotal + receivedTotal} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-foreground">
            <Plus aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">Добавить ожидаемый доход</h2>
            <p className="text-sm text-muted-foreground">Укажите только источник, сумму и дату.</p>
          </div>
        </div>

        <form onSubmit={addItem} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label className="grid gap-2 text-sm font-medium">
            Источник
            <select value={source} onChange={(event) => setSource(event.target.value as Source)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm">
              {sources.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Сумма, ₽
            <input required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Например, 150000" className="h-11 rounded-lg border border-input bg-background px-3 text-sm" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Дата
            <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-lg border border-input bg-background px-3 text-sm" />
          </label>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus aria-hidden="true" className="size-4" /> Добавить
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">Мои ожидаемые доходы</h2>
            <p className="mt-1 text-sm text-muted-foreground">Нажмите на галочку, когда деньги поступили.</p>
          </div>
          <span className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-muted-foreground">{pending.length} в ожидании</span>
        </div>

        {items.length === 0 ? (
          <div className="grid min-h-48 place-items-center px-5 py-10 text-center text-sm text-muted-foreground">
            Пока нет записей. Добавьте первый ожидаемый доход выше.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-xl ${item.received ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                    <CircleDollarSign aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <p className="font-medium">{item.source}</p>
                    <p className="text-sm text-muted-foreground">{new Date(`${item.date}T00:00:00`).toLocaleDateString("ru-RU")}</p>
                  </div>
                </div>
                <p className="font-semibold tabular-nums sm:min-w-32 sm:text-right">{formatAmount(item.amount)} ₽</p>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input type="checkbox" checked={item.received} onChange={() => setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, received: !entry.received } : entry))} className="size-4 accent-emerald-600" />
                  {item.received ? "Получено" : "Еще жду"}
                </label>
                <button type="button" aria-label={`Удалить доход ${item.source}`} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "warning" | "success" }) {
  const toneClass = tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>{formatAmount(value)} ₽</p>
    </div>
  );
}
