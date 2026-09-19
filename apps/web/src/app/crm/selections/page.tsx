import { ClientDirectory, type DirectoryParams } from "@/components/crm/client-directory";

export default async function SelectionsPage({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
  return <ClientDirectory mode="selections" params={await searchParams} />;
}
