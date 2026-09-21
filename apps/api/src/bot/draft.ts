import { z } from "zod";
import { paymentSelectionSchema } from "@rieltordeals/domain";
import type { CardDto, CardInsert } from "../cards/types.js";

const optionalText = z.string().nullable();
const fieldValue = z.union([z.string(), z.boolean()]);

export const candidateSchema = z.object({
  name: optionalText,
  phone: optionalText,
  objectType: optionalText,
  address: optionalText,
  source: optionalText,
  budget: optionalText,
  temperature: z.enum(["cold", "warm", "hot"]).nullable(),
  payment: paymentSelectionSchema.nullable(),
  promisedCallAt: z.string().datetime({ offset: true }).nullable(),
  fields: z.record(z.string(), fieldValue),
  notes: z.array(z.string()),
});

export type Candidate = z.infer<typeof candidateSchema>;
export type DraftRecord = {
  id: string;
  ownerKey: string;
  revision: number;
  role: "buyer" | "seller";
  status: "collecting" | "confirmed";
  candidate: Candidate;
  sourceTexts: string[];
  processedUpdates: number[];
  cardId: string | null;
  targetCardId?: string | null;
  targetUpdatedAt?: string | null;
};

export type ConfirmResult =
  | { status: "ok"; draft: DraftRecord }
  | { status: "not_found" }
  | { status: "conflict" };

export interface DraftStore {
  current(ownerKey: string): Promise<DraftRecord | null>;
  create(ownerKey: string, role: DraftRecord["role"], requestId: string, card?: CardDto): Promise<DraftRecord>;
  get(ownerKey: string, id: string): Promise<DraftRecord | null>;
  save(draft: DraftRecord, expectedRevision: number): Promise<DraftRecord | null>;
  confirm(ownerKey: string, id: string, revision: number, card: CardInsert): Promise<ConfirmResult>;
}

export const emptyCandidate = (): Candidate => ({
  name: null,
  phone: null,
  objectType: null,
  address: null,
  source: "telegram",
  budget: null,
  temperature: null,
  payment: null,
  promisedCallAt: null,
  fields: {},
  notes: [],
});

export function candidateFromCard(card: CardDto): Candidate {
  return { ...emptyCandidate(), name: card.name, phone: card.phone, objectType: card.objectType,
    address: card.address, source: card.source, budget: card.budget, temperature: card.temperature,
    payment: card.payment, promisedCallAt: card.promisedCallAt,
    fields: Object.fromEntries(Object.entries(card.fields).filter((entry): entry is [string, string | boolean] =>
      typeof entry[1] === "string" || typeof entry[1] === "boolean")),
  };
}
