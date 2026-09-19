export default async function CardPage({ params }: PageProps<"/crm/cards/[id]">) {
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Карточка {id}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Поля и исходный текст появятся после <code>packages/domain</code> и{" "}
        <code>GET /cards/:id</code>.
      </p>
    </main>
  );
}
