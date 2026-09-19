import { CardDetails } from "@/components/crm/card-details";

export default async function CardPage({ params }: PageProps<"/crm/cards/[id]">) {
  const { id } = await params;
  return <main><CardDetails id={id} /></main>;
}
