import { ClientDirectory, type DirectoryParams } from "@/components/crm/client-directory";

export default async function ViewingsPage({ searchParams }: { searchParams: Promise<DirectoryParams> }) {
  return <ClientDirectory mode="viewings" params={await searchParams} />;
}
