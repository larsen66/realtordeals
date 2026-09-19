"use client";

import { useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export function DirectoryFilterForm({ path, children }: { path: string; children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value.trim()) search.set(key, value.trim());
    }
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.name === "temperature") {
      if (submitter.value) search.set("temperature", submitter.value);
      else search.delete("temperature");
    }
    startTransition(() => {
      router.push(`${path}${search.size ? `?${search}` : ""}`, { scroll: false });
    });
  }

  return (
    <form
      action={path}
      method="get"
      aria-label="Фильтры клиентов"
      aria-busy={pending}
      onSubmit={apply}
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) event.currentTarget.requestSubmit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          event.currentTarget.requestSubmit();
        }
      }}
    >
      <fieldset disabled={pending} className="min-w-0 space-y-5 disabled:opacity-70">
        {children}
      </fieldset>
      <span role="status" className="sr-only">{pending ? "Обновляю список клиентов" : ""}</span>
    </form>
  );
}
