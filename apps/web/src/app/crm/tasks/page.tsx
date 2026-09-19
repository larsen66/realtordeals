import { WorkList } from "@/components/crm/work-list";

export default async function TasksPage({ searchParams }: PageProps<"/crm/tasks">) {
  return <WorkList params={await searchParams} />;
}
