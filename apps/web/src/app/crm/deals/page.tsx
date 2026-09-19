import { ClientDirectory, type DirectoryParams } from "@/components/crm/client-directory";

export default async function DealsPage({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
  return <ClientDirectory mode="deals" params={await searchParams} />;
}
