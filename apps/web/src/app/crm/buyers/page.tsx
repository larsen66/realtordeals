import { ClientDirectory, type DirectoryParams } from "@/components/crm/client-directory";

export default async function BuyersPage({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
  return <ClientDirectory mode="buyers" params={await searchParams} />;
}
