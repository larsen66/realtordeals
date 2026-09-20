import { ActivitiesBoard } from "@/components/crm/activities-board";
import { listActivities } from "@/lib/activities";
import { RetryLoad } from "@/components/crm/retry-load";

export default async function ActivitiesPage() {
  let result;
  try { result = await listActivities(); } catch { /* Keep a failed load distinct from an empty plan. */ }
  return <main className="w-full space-y-7 px-4 py-7 sm:px-8">
    <header><h1 className="text-2xl font-semibold tracking-tight">Мои активности</h1>
      <p className="mt-2 text-sm text-muted-foreground">Планируйте продвижение и отслеживайте выполненные активности за месяц.</p></header>
    {result ? <ActivitiesBoard activities={result.activities} initialNow={new Date().toISOString()} />
      : <div role="alert" className="rounded-2xl border bg-card p-6">
        <p>Не удалось загрузить активности. Попробуйте обновить страницу.</p>
        <RetryLoad />
      </div>}
  </main>;
}
