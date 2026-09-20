"use client";

import { useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { createCard, fieldString, updateCard, type Card } from "@/lib/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StageStatusControl } from "./card-status-controls";

function ReferralComposer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    startTransition(async () => {
      try {
        await createCard({ role: "buyer", dealType: "purchase", stage: "referral", name: name.trim() || null,
          phone, fields: { referralComment: comment } });
        setName(""); setPhone(""); setComment(""); setOpen(false); router.refresh();
      } catch (err) { setError(err instanceof Error ? err.message : "Не удалось создать реферала"); }
    });
  }
  return <div>
    <Button onClick={() => setOpen(!open)} aria-expanded={open} disabled={pending}><Plus className="size-4" />Добавить реферала</Button>
    {open && <form aria-label="Новый реферал" onSubmit={submit} className="mt-4 grid gap-4 rounded-2xl border bg-card p-5 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Новый реферал</h2>
      <label className="grid gap-1.5 text-sm">Имя<Input autoComplete="name" value={name} onChange={e => setName(e.target.value)} maxLength={200} placeholder="Имя реферала" disabled={pending} /></label>
      <label className="grid gap-1.5 text-sm">Телефон<Input type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} required maxLength={40} placeholder="+7 999 123-45-67" disabled={pending} /></label>
      <label className="grid gap-1.5 text-sm sm:col-span-2">Комментарий по рефералу<Textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={5000} placeholder="Что важно знать о реферале, договорённости и дальнейшие действия" disabled={pending} /></label>
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2"><Button disabled={pending}>{pending ? "Сохраняю…" : "Создать реферала"}</Button><Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Отмена</Button></div>
    </form>}
  </div>;
}

function ReferralComment({ card }: { card: Card }) {
  const router = useRouter();
  const saved = fieldString(card, "referralComment") ?? "";
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState(saved);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    startTransition(async () => {
      try { await updateCard(card.id, { fields: { referralComment: comment } }); setEditing(false); router.refresh(); }
      catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить комментарий"); }
    });
  }
  if (!editing) return <div className="space-y-2">
    <p className="whitespace-pre-wrap break-words text-sm">{saved || "Комментарий пока не добавлен"}</p>
    <Button size="sm" variant="outline" onClick={() => { setComment(saved); setError(""); setEditing(true); }}>{saved ? "Изменить комментарий" : "Добавить комментарий"}</Button>
  </div>;
  return <form onSubmit={submit} className="space-y-2">
    <Textarea aria-label={`Комментарий по рефералу ${card.name || card.phone}`} value={comment} onChange={e => setComment(e.target.value)} maxLength={5000} disabled={pending} autoFocus />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button size="sm" disabled={pending}>{pending ? "Сохраняю…" : "Сохранить комментарий"}</Button><Button size="sm" type="button" variant="outline" disabled={pending} onClick={() => setEditing(false)}>Отмена</Button></div>
  </form>;
}

export function ReferralsDirectory({ cards }: { cards: Card[] }) {
  const [query, setQuery] = useState("");
  const visible = cards.filter(card => [card.name, card.phone, fieldString(card, "referralComment")].filter(Boolean).join(" ").toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")));
  return <div className="space-y-6">
    <ReferralComposer />
    <div className="relative"><Search aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground" />
      <Input className="h-10 bg-card pl-9" aria-label="Поиск реферала" placeholder="Имя, телефон или комментарий" value={query} onChange={e => setQuery(e.target.value)} />
    </div>
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b px-5 py-4"><h2 className="font-semibold">Рефералы</h2><span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{visible.length}</span></div>
      {!visible.length ? <p className="px-5 py-10 text-center text-sm text-muted-foreground">{cards.length ? "По вашему запросу рефералы не найдены." : "Пока нет рефералов. Нажмите «Добавить реферала», чтобы создать первого."}</p>
        : <div className="overflow-x-auto"><table className="w-full min-w-[640px] table-fixed text-left text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="w-1/4 px-5 py-3 font-normal">Реферал / телефон</th><th className="w-[170px] px-5 py-3 font-normal">Статус</th><th className="px-5 py-3 font-normal">Комментарий по рефералу</th></tr></thead>
          <tbody>{visible.map(card => <tr key={card.id} className="border-t align-top">
            <td className="px-5 py-5"><Link className="break-words font-medium hover:underline" href={`/crm/cards/${card.id}`}>{card.name || card.phone}</Link><p className="mt-1 break-words text-xs text-muted-foreground">{card.phone}</p></td>
            <td className="px-5 py-5"><StageStatusControl card={card} /></td>
            <td className="px-5 py-5"><ReferralComment card={card} /></td>
          </tr>)}</tbody>
        </table></div>}
    </section>
  </div>;
}
