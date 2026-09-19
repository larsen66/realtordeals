import { redirect } from "next/navigation";
import { Dashboard } from "@/components/crm/dashboard";
import { firstParam, listCards } from "@/lib/cards";

export default async function CrmPage({ searchParams }: PageProps<"/crm">) {
  const params = await searchParams;
  // Keep existing bookmarks useful after splitting the old dashboard.
  const role = firstParam(params.role);
  const stage = firstParam(params.stage);
  const target = firstParam(params.reminders) === "1" ? "/crm/reminders"
    : stage === "selection" ? "/crm/selections"
    : stage === "viewing" ? "/crm/viewings"
    : stage === "deal" ? "/crm/deals"
    : role === "seller" ? "/crm/sellers"
    : role === "buyer" || firstParam(params.view) === "leads" ? "/crm/buyers" : null;
  if (target) {
    const forwarded = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (!["role", "stage", "view", "reminders"].includes(key) && firstParam(value)) forwarded.set(key, firstParam(value)!);
    }
    redirect(target + (forwarded.size ? "?" + forwarded : ""));
  }
  let cards;
  try { ({ cards } = await listCards()); }
  catch { return <main className="p-6"><h1 className="text-2xl font-semibold">Обзор</h1><p role="alert" className="mt-4 text-sm text-destructive">Не удалось загрузить карточки. Проверьте подключение к API и обновите страницу.</p></main>; }
  return <Dashboard cards={cards} tab={firstParam(params.tab)} />;
}
