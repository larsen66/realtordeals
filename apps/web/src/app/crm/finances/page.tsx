"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Check, Pencil, Plus, Trash2, WalletCards, X } from "lucide-react";
import { ExpectedIncomeSection } from "@/components/crm/expected-income-section";

const CATEGORIES = ["Недвижимость", "Цветы", "Сертификация", "Рилсы"] as const;
type Category = (typeof CATEGORIES)[number];
type IncomeEntry = { id: string; title: string; amount: number; date: string; category?: Category };
type PlannedIncome = Record<string, number>;

const STORAGE_KEY = "crm-manual-finance-entries";
const BALANCE_STORAGE_KEY = "crm-manual-finance-balance";
const PLANNED_STORAGE_KEY = "crm-planned-finance-income";

function balanceTone(value: number) {
  if (value < 200_000) return { label: "Низкий остаток", color: "#dc3d36", softColor: "#fff0ef" };
  if (value < 500_000) return { label: "Средний остаток", color: "#ee9829", softColor: "#fff6e8" };
  if (value < 800_000) return { label: "Хороший остаток", color: "#39a8d1", softColor: "#edf9fd" };
  return { label: "Высокий остаток", color: "#43b66a", softColor: "#eefaf1" };
}

const formatMoney = (value: number) => `${new Intl.NumberFormat("ru-RU").format(value)} ₽`;
const monthNow = () => new Date().toISOString().slice(0, 7);
const monthLabel = (value: string) => new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(`${value}-01T12:00:00`));

export default function FinancesPage() {
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [planned, setPlanned] = useState<PlannedIncome>({});
  const [balance, setBalance] = useState(0);
  const [balanceInput, setBalanceInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>(CATEGORIES[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState(() => monthNow());
  const [plannedInput, setPlannedInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<IncomeEntry | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) setEntries(parsed as IncomeEntry[]);
      const savedBalance = window.localStorage.getItem(BALANCE_STORAGE_KEY);
      const parsedBalance = savedBalance === null ? 0 : Number(savedBalance);
      if (Number.isFinite(parsedBalance) && parsedBalance >= 0) {
        setBalance(parsedBalance);
        setBalanceInput(String(parsedBalance));
      }
      const savedPlanned = window.localStorage.getItem(PLANNED_STORAGE_KEY);
      const parsedPlanned = savedPlanned ? JSON.parse(savedPlanned) : {};
      if (parsedPlanned && typeof parsedPlanned === "object") setPlanned(parsedPlanned as PlannedIncome);
    } catch { /* local-only data is optional */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.localStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(planned));
  }, [entries, planned, hydrated]);

  useEffect(() => setPlannedInput(planned[selectedMonth] ? String(planned[selectedMonth]) : ""), [planned, selectedMonth]);

  const tone = balanceTone(balance);
  const monthEntries = useMemo(() => entries.filter((entry) => entry.date.slice(0, 7) === selectedMonth), [entries, selectedMonth]);
  const totals = useMemo(() => CATEGORIES.reduce<Record<Category, number>>((result, item) => {
    result[item] = monthEntries.filter((entry) => (entry.category ?? "Недвижимость") === item).reduce((sum, entry) => sum + entry.amount, 0);
    return result;
  }, { "Недвижимость": 0, "Цветы": 0, "Сертификация": 0, "Рилсы": 0 }), [monthEntries]);
  const monthTotal = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const plannedTotal = planned[selectedMonth] ?? 0;

  function saveBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedBalance = Number(balanceInput.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(parsedBalance) || parsedBalance < 0) return;
    setBalance(parsedBalance);
    window.localStorage.setItem(BALANCE_STORAGE_KEY, String(parsedBalance));
  }

  function savePlanned(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(plannedInput.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) return;
    setPlanned((current) => ({ ...current, [selectedMonth]: parsedAmount }));
  }

  function clearBalance() {
    setBalance(0);
    setBalanceInput("");
    window.localStorage.removeItem(BALANCE_STORAGE_KEY);
  }

  function clearPlanned() {
    setPlanned((current) => {
      const next = { ...current };
      delete next[selectedMonth];
      return next;
    });
    setPlannedInput("");
  }

  function addIncome(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !title.trim()) return;
    setEntries((current) => [...current, { id: crypto.randomUUID(), title: title.trim(), amount: parsedAmount, date, category }]);
    setTitle(""); setAmount("");
  }

  function startEditing(entry: IncomeEntry) {
    setEditingId(entry.id);
    setEditEntry({ ...entry });
  }

  function saveEntryEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editEntry?.title.trim()) return;
    const parsedAmount = Number(String(editEntry.amount).replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setEntries((current) => current.map((entry) => entry.id === editEntry.id ? { ...editEntry, title: editEntry.title.trim(), amount: parsedAmount } : entry));
    setEditingId(null);
    setEditEntry(null);
  }

  function deleteEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditEntry(null);
    }
  }

  const clearButton = (label: string, onClick: () => void) => (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
      <X aria-hidden="true" className="size-4" />
    </button>
  );

  return (
    <main className="w-full space-y-7 px-4 py-7 sm:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Финансы</h1><p className="mt-2 text-sm text-muted-foreground">Доходы по направлениям и итог за месяц</p></div><label className="grid gap-1.5 text-sm font-medium">Месяц отчёта<input className="h-10 rounded-md border bg-card px-3 font-normal" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} /></label></header>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <article className="relative overflow-hidden rounded-2xl border bg-card p-4 sm:p-5" style={{ borderColor: `${tone.color}55` }}><div aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: tone.color }} /><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">Сумма остатка</p><p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{formatMoney(balance)}</p></div><div className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: tone.softColor, color: tone.color }}><WalletCards aria-hidden="true" className="size-5" /></div></div><form onSubmit={saveBalance} className="mt-5 flex flex-wrap items-end gap-3"><label className="grid min-w-[220px] flex-1 gap-1.5 text-sm">Внести остаток вручную<div className="relative"><input className="h-10 w-full rounded-md border bg-card px-3 pr-9" inputMode="decimal" value={balanceInput} onChange={(event) => setBalanceInput(event.target.value)} placeholder="Например, 250000" aria-label="Сумма остатка" />{balanceInput && clearButton("Очистить сумму остатка", clearBalance)}</div></label><button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90" type="submit">Сохранить остаток</button><button type="button" onClick={clearBalance} disabled={!balance && !balanceInput} className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40" aria-label="Удалить остаток" title="Удалить остаток"><Trash2 aria-hidden="true" className="size-4" /></button></form><div className="mt-5 flex items-center gap-3 text-sm"><span className="size-3 rounded-full" style={{ backgroundColor: tone.color }} /><span className="font-medium" style={{ color: tone.color }}>{tone.label}</span></div></article>
        <article className="rounded-2xl border bg-card p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">Планируемый доход</p><p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(plannedTotal)}</p><p className="mt-1 text-sm text-muted-foreground">на {monthLabel(selectedMonth)}</p></div><div className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground"><CalendarDays aria-hidden="true" className="size-5" /></div></div><form onSubmit={savePlanned} className="mt-5 flex items-end gap-3"><label className="grid flex-1 gap-1.5 text-sm">Сумма плана<div className="relative"><input className="h-10 w-full rounded-md border bg-card px-3 pr-9" inputMode="decimal" value={plannedInput} onChange={(event) => setPlannedInput(event.target.value)} placeholder="Например, 300000" aria-label="Планируемый доход" />{plannedInput && clearButton("Очистить план", clearPlanned)}</div></label><button className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90" type="submit">Сохранить</button><button type="button" onClick={clearPlanned} disabled={!plannedInput && !plannedTotal} className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm text-muted-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40" aria-label="Удалить план" title="Удалить план"><Trash2 aria-hidden="true" className="size-4" /></button></form></article>
      </section>

      <section className="rounded-2xl border bg-card p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-semibold">Итоги за {monthLabel(selectedMonth)}</h2><p className="mt-1 text-sm text-muted-foreground">Фактические поступления по каждому направлению</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Всего за месяц</p><p className="text-2xl font-semibold tabular-nums">{formatMoney(monthTotal)}</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{CATEGORIES.map((item) => <div key={item} className="rounded-xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">{item}</p><p className="mt-2 text-xl font-semibold tabular-nums">{formatMoney(totals[item])}</p></div>)}</div>{plannedTotal > 0 ? <p className="mt-4 text-sm text-muted-foreground">До плана осталось {formatMoney(Math.max(plannedTotal - monthTotal, 0))}{monthTotal >= plannedTotal ? " — план выполнен" : ""}.</p> : null}</section>

      <section className="rounded-2xl border bg-card p-5 sm:p-6"><div><h2 className="font-semibold">Доходы</h2><p className="mt-1 text-sm text-muted-foreground">Укажите доход один раз — он автоматически попадёт в итоги выбранного направления и месяца.</p></div><form onSubmit={addIncome} className="mt-5 grid gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-[1fr_180px_150px_150px_auto] sm:items-end"><label className="grid gap-1.5 text-sm">Доход<div className="relative"><input className="h-10 w-full rounded-md border bg-card px-3 pr-9" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, комиссия" required />{title && clearButton("Очистить название дохода", () => setTitle(""))}</div></label><label className="grid gap-1.5 text-sm">Направление<select className="h-10 rounded-md border bg-card px-3" value={category} onChange={(event) => setCategory(event.target.value as Category)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="grid gap-1.5 text-sm">Сумма, ₽<div className="relative"><input className="h-10 w-full rounded-md border bg-card px-3 pr-9" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="150000" required />{amount && clearButton("Очистить сумму дохода", () => setAmount(""))}</div></label><label className="grid gap-1.5 text-sm">Дата<input className="h-10 rounded-md border bg-card px-3" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label><button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90" type="submit"><Plus className="size-4" />Добавить</button></form><div className="mt-5 space-y-2">{monthEntries.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">За выбранный месяц доходов пока нет.</p> : monthEntries.map((entry) => editingId === entry.id && editEntry ? <form key={entry.id} onSubmit={saveEntryEdit} className="grid gap-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-[1fr_160px_140px_140px_auto] sm:items-center"><input className="h-9 rounded-md border bg-card px-2 text-sm" value={editEntry.title} onChange={(event) => setEditEntry({ ...editEntry, title: event.target.value })} aria-label="Название дохода" /><select className="h-9 rounded-md border bg-card px-2 text-sm" value={editEntry.category ?? CATEGORIES[0]} onChange={(event) => setEditEntry({ ...editEntry, category: event.target.value as Category })}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select><input className="h-9 rounded-md border bg-card px-2 text-sm" inputMode="decimal" value={editEntry.amount} onChange={(event) => setEditEntry({ ...editEntry, amount: event.target.value as unknown as number })} aria-label="Сумма дохода" /><input className="h-9 rounded-md border bg-card px-2 text-sm" type="date" value={editEntry.date} onChange={(event) => setEditEntry({ ...editEntry, date: event.target.value })} /><div className="flex gap-1"><button type="submit" className="inline-flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground" aria-label="Сохранить изменения" title="Сохранить"><Check className="size-4" /></button><button type="button" onClick={() => { setEditingId(null); setEditEntry(null); }} className="inline-flex size-9 items-center justify-center rounded-md border" aria-label="Отменить редактирование" title="Отмена"><X className="size-4" /></button></div></form> : <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-medium">{entry.title}</p><p className="text-xs text-muted-foreground">{entry.category ?? CATEGORIES[0]} · {entry.date}</p></div><div className="flex items-center gap-3"><span className="font-semibold tabular-nums">{formatMoney(entry.amount)}</span><button type="button" onClick={() => startEditing(entry)} className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-accent hover:text-foreground" aria-label={`Редактировать ${entry.title}`} title="Редактировать"><Pencil className="size-4" /></button><button type="button" onClick={() => deleteEntry(entry.id)} className="inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Удалить ${entry.title}`} title="Удалить"><Trash2 className="size-4" /></button></div></div>)}</div><p className="mt-4 text-xs text-muted-foreground">После добавления запись не дублируется отдельной строкой ниже — проверяйте результат в блоке «Итоги за месяц».</p></section>
      <ExpectedIncomeSection />
    </main>
  );
}

