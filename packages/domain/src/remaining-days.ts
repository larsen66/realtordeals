function calendarDaysUntil(iso: string, now: Date): number {
  const due = new Date(iso);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = new Date(due);
  day.setHours(0, 0, 0, 0);
  return Math.round((day.getTime() - start.getTime()) / 86400000);
}

function ruDays(count: number): string {
  const abs = Math.abs(count) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) {
    return "дней";
  }
  if (last === 1) {
    return "день";
  }
  if (last >= 2 && last <= 4) {
    return "дня";
  }
  return "дней";
}

export function formatRemainingDays(
  iso: string | null | undefined,
  now = new Date(),
): string {
  if (!iso) {
    return "—";
  }
  const diff = calendarDaysUntil(iso, now);
  if (diff === 0) {
    return "сегодня";
  }
  if (diff > 0) {
    return diff === 1 ? "остался 1 день" : `осталось ${diff} ${ruDays(diff)}`;
  }
  const overdue = -diff;
  return overdue === 1
    ? "просрочено на 1 день"
    : `просрочено на ${overdue} ${ruDays(overdue)}`;
}
