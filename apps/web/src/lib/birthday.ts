/** Show birthday reminders during the three preceding calendar days and on the day itself. */
export function isBirthdaySoon(value: string | null, now = new Date()): boolean {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!match || Number.isNaN(now.getTime())) return false;
  const [, rawYear, rawMonth, rawDay] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return false;

  // Use the agency's calendar day, independent of the server's local timezone.
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const calendar = Object.fromEntries(parts.map(({ type, value }) => [type, Number(value)]));
  const today = Date.UTC(calendar.year, calendar.month - 1, calendar.day);

  return [calendar.year, calendar.year + 1].some((nextYear) => {
    const birthday = new Date(Date.UTC(nextYear, month - 1, day));
    // February 29 remains February 29 rather than silently becoming March 1.
    if (birthday.getUTCMonth() !== month - 1 || birthday.getUTCDate() !== day) return false;
    const days = (birthday.getTime() - today) / 86_400_000;
    return days >= 0 && days <= 3;
  });
}
