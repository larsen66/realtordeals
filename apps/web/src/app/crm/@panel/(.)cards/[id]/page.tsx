import { CardDetails } from "@/components/crm/card-details";
import { CardPanel } from "@/components/crm/card-panel";

export default async function CardPanelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CardPanel key={id}><CardDetails id={id} panel /></CardPanel>;
}
