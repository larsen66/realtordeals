import { z } from "zod";

export const cardRoleSchema = z.enum(["seller", "buyer"]);
export const dealTypeSchema = z.enum(["sale", "purchase"]);
export const temperatureSchema = z.enum(["cold", "warm", "hot"]);
export const paymentSchema = z.enum(["cash", "mortgage"]);
export const buyerStageSchema = z.enum([
  "selection",
  "viewing",
  "close",
  "deal",
  "referral",
]);
export const whoseApartmentSchema = z.enum(["own", "other"]);
export const finishSchema = z.enum(["rough", "prefinish", "renovated"]);
export const selectionStatusSchema = z.enum(["waiting", "awaiting_reply"]);
export const referralStatusSchema = z.enum(["posted", "not_posted"]);

export type CardRole = z.infer<typeof cardRoleSchema>;
export type DealType = z.infer<typeof dealTypeSchema>;
export type Temperature = z.infer<typeof temperatureSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type BuyerStage = z.infer<typeof buyerStageSchema>;
export type WhoseApartment = z.infer<typeof whoseApartmentSchema>;
export type Finish = z.infer<typeof finishSchema>;
export type SelectionStatus = z.infer<typeof selectionStatusSchema>;
export type ReferralStatus = z.infer<typeof referralStatusSchema>;

export const cardRoles = cardRoleSchema.options;
export const dealTypes = dealTypeSchema.options;
export const temperatures = temperatureSchema.options;
export const payments = paymentSchema.options;
export const buyerStages = buyerStageSchema.options;
export const selectionStatuses = selectionStatusSchema.options;
export const referralStatuses = referralStatusSchema.options;
