import { CardForm } from "@/components/crm/card-form";
import { CardPanel } from "@/components/crm/card-panel";
import { firstParam } from "@/lib/cards";

export default async function NewCardPanel({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const role = firstParam((await searchParams).role) === "seller" ? "seller" : "buyer";
  return <CardPanel><div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
    <h1 className="mb-6 text-2xl font-semibold">{role === "buyer" ? "Новый покупатель" : "Новый продавец"}</h1>
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6"><CardForm key={role} initialRole={role} /></div>
  </div></CardPanel>;
}
