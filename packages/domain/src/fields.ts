import { z } from "zod";
import type { CardRole } from "./enums.js";
import { finishSchema, whoseApartmentSchema } from "./enums.js";
import { cardTaskSchema } from "./tasks.js";

const optionalText = z.preprocess((value) => {
  if (value == null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalBoolean = z.preprocess((value) => {
  if (value == null) {
    return undefined;
  }
  return value;
}, z.boolean().optional());

export const sellerFieldsSchema = z
  .object({
    tasks: cardTaskSchema.array().optional(),
    price: optionalText,
    rooms: optionalText,
    area: optionalText,
    floor: optionalText,
    floors: optionalText,
    whoseApartment: z.preprocess((value) => value === null ? undefined : value, whoseApartmentSchema.optional()),
    listingUrl: optionalText,
    mortgage: optionalBoolean,
    arrests: optionalBoolean,
    ownersCount: optionalText,
    saleGoal: optionalText,
    saleSpeed: optionalText,
    whatTheyLeave: optionalText,
    childrenShares: optionalBoolean,
    maternityCapital: optionalBoolean,
    priceUnderstatement: optionalBoolean,
  })
  .passthrough();

export const buyerFieldsSchema = z
  .object({
    tasks: cardTaskSchema.array().optional(),
    selectionNotes: optionalText,
    selectionLinks: optionalText,
    purchaseWhat: optionalText,
    purchaseMethod: optionalText,
    location: optionalText,
    locationWhy: optionalText,
    area: optionalText,
    layout: optionalText,
    finish: z.preprocess((value) => value === null ? undefined : value, finishSchema.optional()),
    purchaseGoal: optionalText,
    viewedBefore: optionalBoolean,
    developersViewed: optionalText,
    whereViewed: optionalText,
    rooms: optionalText,
    listingUrl: optionalText,
    district: optionalText,
    metro: optionalText,
    selectionCount: optionalText,
  })
  .passthrough();

export type SellerFields = z.infer<typeof sellerFieldsSchema>;
export type BuyerFields = z.infer<typeof buyerFieldsSchema>;
export type CardFields = SellerFields | BuyerFields;

export function fieldsSchemaFor(role: CardRole) {
  return role === "seller" ? sellerFieldsSchema : buyerFieldsSchema;
}

export function parseCardFields(role: CardRole, fields: unknown): CardFields {
  return fieldsSchemaFor(role).parse(fields ?? {});
}
