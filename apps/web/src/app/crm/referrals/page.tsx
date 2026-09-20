import { ReferralsDirectory } from "@/components/crm/referrals-directory";
import { listCards } from "@/lib/cards";
import { RetryLoad } from "@/components/crm/retry-load";

export default async function ReferralsPage() {
  let result;
  try { result = await listCards({ role: "buyer", stage: "referral" }); } catch { /* Show load failure rather than an empty list. */ }
  return <main className="w-full space-y-7 px-4 py-7 sm:px-8">
    <header><h1 className="text-2xl font-semibold tracking-tight">Мои рефералы</h1>
      <p className="mt-2 text-sm text-muted-foreground">Контакты рефералов, комментарии и договорённости в одном месте.</p></header>
    {result ? <ReferralsDirectory cards={result.cards} /> : <div role="alert" className="rounded-2xl border bg-card p-6">
      <p>Не удалось загрузить рефералов. Попробуйте обновить страницу.</p><RetryLoad />
    </div>}
  </main>;
}
