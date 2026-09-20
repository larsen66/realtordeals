export const pillTones = {
  gray: "bg-[#667085] text-white dark:bg-white/10",
  blue: "bg-[#2563eb] text-white dark:bg-blue-400/15",
  sky: "bg-[#087fa3] text-white dark:bg-sky-400/15",
  amber: "bg-[#a16a00] text-white dark:bg-amber-400/15",
  green: "bg-[#25834a] text-white dark:bg-emerald-400/15",
  red: "bg-[#d63d34] text-white dark:bg-red-400/15",
  scarlet: "bg-[#d63d34] text-white dark:bg-red-400/15",
  violet: "bg-[#8751d0] text-white dark:bg-violet-400/15",
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
    return "scarlet";
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
