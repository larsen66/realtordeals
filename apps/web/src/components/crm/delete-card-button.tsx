"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { deleteCard } from "@/lib/cards";

export function DeleteCardButton({ cardId, visible = true }: { cardId: string; visible?: boolean }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteCard(cardId);
      setConfirmOpen(false);
      router.refresh();
    } catch (cause) {
      setDeleting(false);
      setError(cause instanceof Error ? cause.message : "Не удалось удалить лида. Повторите попытку.");
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Удалить лида"
        title="Удалить лида"
        onClick={() => { setError(null); setConfirmOpen(true); }}
        className={`inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-opacity hover:bg-destructive/10 hover:text-destructive ${visible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="presentation" onMouseDown={() => !deleting && setConfirmOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby={`delete-title-${cardId}`} className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 id={`delete-title-${cardId}`} className="text-base font-semibold text-foreground">Вы точно хотите удалить лида?</h2>
              <button type="button" aria-label="Закрыть" onClick={() => setConfirmOpen(false)} disabled={deleting} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
            </div>
            {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={deleting} className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted">НЕТ</button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="h-9 rounded-lg bg-destructive px-4 text-sm font-medium text-white hover:opacity-90">{deleting ? "Удаляем…" : "ДА"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
