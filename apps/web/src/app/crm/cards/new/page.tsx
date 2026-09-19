import { CardForm } from "@/components/crm/card-form";
import { firstParam } from "@/lib/cards";

export default async function NewCardPage({ searchParams }: PageProps<"/crm/cards/new">) {
  const role = firstParam((await searchParams).role) === "seller" ? "seller" : "buyer";
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-foreground">
          {role === "buyer" ? "Новый покупатель" : "Новый продавец"}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Заполните данные и подтвердите создание карточки.
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_1px_2px_rgb(16_24_40_/_4%)]">
        <CardForm key={role} initialRole={role} />
      </div>
    </main>
  );
}
