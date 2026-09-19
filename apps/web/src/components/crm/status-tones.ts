export const pillTones = {
  gray: "bg-[#eef0f3] text-[#5b6570] dark:bg-white/10 dark:text-neutral-300",
  blue: "bg-[#e8f1ff] text-[#245ac4] dark:bg-blue-400/15 dark:text-blue-300",
  sky: "bg-[#e7f6fb] text-[#1a7080] dark:bg-sky-400/15 dark:text-sky-300",
  amber: "bg-[#fff3d6] text-[#855b00] dark:bg-amber-400/15 dark:text-amber-300",
  green: "bg-[#e5f6ea] text-[#246c3b] dark:bg-emerald-400/15 dark:text-emerald-300",
  red: "bg-[#fee4e2] text-[#b42318] dark:bg-red-400/15 dark:text-red-300",
  violet: "bg-[#f4ebff] text-[#6941c6] dark:bg-violet-400/15 dark:text-violet-300",
} as const;

export type PillTone = keyof typeof pillTones;

export function temperatureTone(value: string | null | undefined): PillTone {
  if (value === "hot") {
    return "red";
  }
  if (value === "warm") {
    return "amber";
  }
  if (value === "cold") {
    return "sky";
  }
  return "gray";
}

export function paymentTone(value: string | null | undefined): PillTone {
  if (value === "cash") {
    return "green";
  }
  if (value === "mortgage") {
    return "blue";
  }
  return "gray";
}

export function stageTone(value: string | null | undefined): PillTone {
  if (value === "selection") {
    return "amber";
  }
  if (value === "viewing") {
    return "sky";
  }
  if (value === "close") {
    return "blue";
  }
  if (value === "deal") {
    return "green";
  }
  if (value === "referral") {
    return "violet";
  }
  return "gray";
}

export function selectionStatusTone(value: string | null | undefined): PillTone {
  if (value === "awaiting_reply") {
    return "blue";
  }
  if (value === "waiting") {
    return "amber";
  }
  return "gray";
}

export function referralStatusTone(value: string | null | undefined): PillTone {
  if (value === "posted") {
    return "green";
  }
  if (value === "not_posted") {
    return "gray";
  }
  return "gray";
}

export function roleTone(value: string | null | undefined): PillTone {
  if (value === "buyer" || value === "Покупатель") {
    return "blue";
  }
  if (value === "seller" || value === "Продавец") {
    return "green";
  }
  if (value === "purchase" || value === "Покупка") {
    return "sky";
  }
  if (value === "sale" || value === "Продажа") {
    return "amber";
  }
  return "gray";
}

export function dueTone(label: string): string {
  if (label.startsWith("просрочено")) {
    return "text-destructive";
  }
  if (label === "сегодня") {
    return "text-[#855b00] dark:text-[#fcd34d]";
  }
  return "text-muted-foreground";
}
