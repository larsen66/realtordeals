"use client";

import { getSelectionTimerState, selectionTimerSchema } from "@rieltordeals/domain";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { updateCard, type Card } from "@/lib/cards";

const tones = [
  "bg-[#166534] text-white",
  "bg-[#bbf7d0] text-[#14532d]",
  "bg-[#bae6fd] text-[#0c4a6e]",
  "bg-[#0369a1] text-white",
] as const;

export function SelectionTimer({ card }: { card: Card }) {
  const router = useRouter();
  const parsed = selectionTimerSchema.safeParse(card.fields.selectionTimer);
  const timer = parsed.success ? parsed.data : null;
  const [durationHours, setDurationHours] = useState<24 | 48>(timer?.durationHours ?? 24);
  const [now, setNow] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Recalculate from the persisted deadline, including after sleep or a hidden tab.
    const tick = () => setNow(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const state = timer && now !== null ? getSelectionTimerState(timer, now) : null;
  const sent = card.selectionStatus === "awaiting_reply";

  async function start() {
    setPending(true);
    setError("");
    try {
      await updateCard(card.id, {
        selectionStatus: "waiting",
        fields: { selectionTimer: {
          durationHours,
          endsAt: new Date(Date.now() + durationHours * 3_600_000).toISOString(),
        } },
      });
      setNow(Date.now());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось запустить таймер");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-w-[205px] space-y-2" aria-label={`Таймер подборки: ${card.name ?? card.phone}`}>
      <div className="flex items-center gap-2">
        {timer ? (
          <span role="timer" aria-label="Осталось часов и минут" className={`inline-flex rounded-lg px-3 py-1.5 font-mono text-lg font-semibold tabular-nums ${tones[state?.phase ?? 0]}`}>
            {state?.text ?? "—:—"}
          </span>
        ) : <span className="text-xs text-muted-foreground">Не запущен</span>}
        {state?.expired && !sent && (
          <span role="status" className="max-w-[145px] whitespace-normal text-xs font-semibold leading-4 text-destructive">Ты сейчас теряешь машину</span>
        )}
        {sent && <span className="max-w-[110px] whitespace-normal text-xs text-muted-foreground">Подборка отправлена</span>}
      </div>
      <div className="flex items-center gap-2">
        <select aria-label="Длительность таймера" value={durationHours} disabled={pending}
          onChange={(event) => setDurationHours(Number(event.target.value) as 24 | 48)}
          className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground disabled:opacity-50">
          <option value={24}>24 часа</option>
          <option value={48}>48 часов</option>
        </select>
        <button type="button" disabled={pending} onClick={start}
          title="Запустить новый отсчёт и установить статус «ждет»"
          className="h-8 rounded-md bg-secondary px-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50">
          {pending ? "Сохраняю…" : timer ? "Заново" : "Запустить"}
        </button>
      </div>
      {error && <p role="alert" className="max-w-[250px] whitespace-normal text-xs text-destructive">{error}</p>}
    </div>
  );
}
