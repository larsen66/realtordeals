import { z } from "zod";
import { OpenAiAgent, type CrmExtractionSchema } from "@rieltordeals/worker";
import type { Role } from "./contract.js";

const nullableText = { type: ["string", "null"] } as const;
const nullableBoolean = { type: ["boolean", "null"] } as const;
const candidateSchema = z.object({
  name: z.string().nullable(),
  phone: z.string().nullable(),
  objectType: z.string().nullable(),
  address: z.string().nullable(),
  source: z.string().nullable(),
  budget: z.string().nullable(),
  temperature: z.enum(["cold", "warm", "hot"]).nullable(),
  payment: z.enum(["cash", "mortgage"]).nullable(),
  promisedCallAt: z.string().datetime({ offset: true }).nullable(),
  fields: z.record(z.string(), z.union([z.string(), z.boolean(), z.null()])),
  notes: z.array(z.string()),
});

export type ExtractionCandidate = z.infer<typeof candidateSchema>;

const sellerProperties = {
  price: nullableText, rooms: nullableText, area: nullableText, floor: nullableText, floors: nullableText,
  whoseApartment: { type: ["string", "null"], enum: ["own", "other", null] }, listingUrl: nullableText,
  mortgage: nullableBoolean, arrests: nullableBoolean, ownersCount: nullableText, saleGoal: nullableText,
  saleSpeed: nullableText, whatTheyLeave: nullableText, childrenShares: nullableBoolean,
  maternityCapital: nullableBoolean, priceUnderstatement: nullableBoolean,
};
const buyerProperties = {
  selectionNotes: nullableText, selectionLinks: nullableText, purchaseWhat: nullableText,
  purchaseMethod: nullableText, location: nullableText, locationWhy: nullableText, area: nullableText,
  layout: nullableText, finish: { type: ["string", "null"], enum: ["rough", "prefinish", "renovated", null] },
  purchaseGoal: nullableText, viewedBefore: nullableBoolean, developersViewed: nullableText,
  whereViewed: nullableText, rooms: nullableText, listingUrl: nullableText, district: nullableText,
  metro: nullableText, selectionCount: nullableText,
};

function jsonSchemaFor(role: Role): Record<string, unknown> {
  const fieldProperties = role === "seller" ? sellerProperties : buyerProperties;
  return {
    type: "object", additionalProperties: false,
    required: ["name", "phone", "objectType", "address", "source", "budget", "temperature", "payment", "promisedCallAt", "fields", "notes"],
    properties: {
      name: nullableText, phone: nullableText, objectType: nullableText, address: nullableText,
      source: nullableText, budget: nullableText,
      temperature: { type: ["string", "null"], enum: ["cold", "warm", "hot", null] },
      payment: { type: ["string", "null"], enum: ["cash", "mortgage", null] },
      promisedCallAt: nullableText,
      fields: {
        type: "object", additionalProperties: false,
        required: Object.keys(fieldProperties), properties: fieldProperties,
      },
      notes: { type: "array", items: { type: "string" } },
    },
  };
}

function clean(candidate: ExtractionCandidate): ExtractionCandidate {
  const fields = Object.fromEntries(Object.entries(candidate.fields).filter(([, value]) => value !== null));
  return { ...candidate, fields };
}

export class CrmExtractor {
  constructor(private agent: OpenAiAgent) {}

  async fromText(role: Role, sourceText: string, currentFields: Record<string, unknown>, operation: "text_analysis" | "voice_analysis" = "text_analysis"): Promise<ExtractionCandidate> {
    const schema: CrmExtractionSchema<ExtractionCandidate> = {
      jsonSchema: jsonSchemaFor(role), parse: (value) => clean(candidateSchema.parse(value)),
    };
    return this.agent.extract({ role, sourceText, currentFields }, schema, operation);
  }

  async fromVoice(role: Role, voice: File, currentFields: Record<string, unknown>) {
    const transcript = await this.agent.transcribe(voice);
    return { transcript, candidate: await this.fromText(role, transcript, currentFields, "voice_analysis") };
  }
}
