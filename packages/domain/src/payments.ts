import { z } from "zod";
import { paymentSchema, payments } from "./enums.js";

// Accept legacy single values; expose a stable, deduplicated list to the API.
export const paymentSelectionSchema = z.union([
  paymentSchema,
  paymentSchema.array(),
  z.null(),
]).transform((value) => {
  const selected = value === null ? [] : Array.isArray(value) ? value : [value];
  return payments.filter((payment) => selected.includes(payment));
});
