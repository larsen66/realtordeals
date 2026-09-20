import { z } from "zod";

export const selectionTimerSchema = z.object({
  durationHours: z.union([z.literal(24), z.literal(48)]),
  endsAt: z.iso.datetime(),
});

export type SelectionTimer = z.infer<typeof selectionTimerSchema>;

export type SelectionTimerState = {
  text: string;
  phase: 0 | 1 | 2 | 3;
  expired: boolean;
};

export function getSelectionTimerState(
  timer: SelectionTimer,
  nowMs: number,
): SelectionTimerState {
  const remainingMs = Math.max(0, Date.parse(timer.endsAt) - nowMs);
  const minutes = Math.ceil(remainingMs / 60_000);
  const hoursText = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minutesText = String(minutes % 60).padStart(2, "0");
  const quarterMs = (timer.durationHours * 3_600_000) / 4;
  const phase = remainingMs > quarterMs * 3 ? 0
    : remainingMs > quarterMs * 2 ? 1
      : remainingMs > quarterMs ? 2 : 3;

  return {
    text: `${hoursText}:${minutesText}`,
    phase,
    expired: remainingMs === 0,
  };
}
