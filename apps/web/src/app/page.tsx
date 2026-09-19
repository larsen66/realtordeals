export default function LandingPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Заявка</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Лендинг. Форма имени и телефона будет писать карточку покупателя в{" "}
        <code>apps/api</code> через <code>POST /leads</code>.
      </p>
    </main>
  );
}
