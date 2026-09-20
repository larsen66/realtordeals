"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function RetryLoad() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <Button className="mt-3" variant="outline" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
    {pending ? "Загружаю…" : "Повторить загрузку"}
  </Button>;
}
