import { ClientDirectory, type DirectoryParams } from "@/components/crm/client-directory";

export default async function SellersPage({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
  return <ClientDirectory mode="sellers" params={await searchParams} />;
}
