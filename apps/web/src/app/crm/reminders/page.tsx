import { WorkList } from "@/components/crm/work-list";

export default async function RemindersPage({ searchParams }: PageProps<"/crm/reminders">) {
  return <WorkList params={await searchParams} reminders />;
}
