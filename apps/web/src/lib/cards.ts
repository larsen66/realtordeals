import type {
  BuyerStage,
  CardFields,
  CardRole,
  DealType,
  Payment,
  ReferralStatus,
  SelectionStatus,
  Temperature,
} from "@rieltordeals/domain";
import { formatRemainingDays } from "@rieltordeals/domain";
import { apiJson } from "./api";

export type Card = {
  id: string;
  role: CardRole;
  dealType: DealType;
  phone: string;
  name: string | null;
  objectType: string | null;
  address: string | null;
  source: string | null;
  budget: string | null;
  temperature: Temperature | null;
  payment: Payment[];
  stage: BuyerStage | null;
  selectionStatus: SelectionStatus | null;
  referralStatus: ReferralStatus | null;
  birthday: string | null;
  sourceText: string | null;
  promisedCallAt: string | null;
  fields: CardFields;
  tags: [string, string];
  createdAt: string;
  updatedAt: string;
};

export type CardFilters = {
  role?: string;
  temperature?: string;
  stage?: string;
};

export function queryString(filters: CardFilters) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      qs.set(key, value);
    }
  }
  const encoded = qs.toString();
  return encoded ? `?${encoded}` : "";
}

export function listCards(filters: CardFilters = {}) {
  return apiJson<{ cards: Card[] }>(`/cards${queryString(filters)}`);
}

export function getCard(id: string) {
  return apiJson<{ card: Card }>(`/cards/${id}`);
}

export function createCard(body: unknown) {
  return apiJson<{ card: Card }>("/cards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateCard(id: string, body: unknown) {
  return apiJson<{ card: Card }>(`/cards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function formatDay(value: string | null) {
  if (!value) {
    return "—";
  }
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return "—";
  }
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}

export function formatDue(value: string | null) {
  return formatRemainingDays(value);
}

export function formatWhen(value: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  const time = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const diff = (day.getTime() - start.getTime()) / 86400000;
  if (diff === 0) {
    return `сегодня, ${time}`;
  }
  if (diff === 1) {
    return `завтра, ${time}`;
  }
  if (diff === -1) {
    return `вчера, ${time}`;
  }
  const dayMonth = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(date);
  return `${dayMonth}, ${time}`;
}

export function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function fieldValue(card: Card, key: string) {
  return (card.fields as Record<string, unknown>)[key];
}

export function fieldString(card: Card, key: string) {
  const value = fieldValue(card, key);
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export function fieldBool(card: Card, key: string) {
  return fieldValue(card, key) === true;
}

export function matchesQuery(card: Card, query: string) {
  const haystack = [
    card.name,
    card.phone,
    card.address,
    card.objectType,
    card.budget,
    card.source,
    fieldString(card, "price"),
    fieldString(card, "district"),
    fieldString(card, "metro"),
    fieldString(card, "taskTitle"),
    card.sourceText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}
