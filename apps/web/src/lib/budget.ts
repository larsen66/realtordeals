export function formatBudget(value: string): string {
  const compact = value.replace(/\s/g, "");
  const match = compact.match(/^(\d+)([.,]\d*)?$/);
  if (!match) return value;

  return match[1].replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (match[2] ?? "");
}

export function formatWholeAmount(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
