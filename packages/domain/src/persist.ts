import { z } from "zod";
import { cardRoleSchema, dealTypeSchema } from "./enums.js";

export const persistCardSchema = z.object({
  role: cardRoleSchema,
  dealType: dealTypeSchema,
  phone: z.string().trim().min(1, "phone is required"),
});

export type PersistCardInput = z.infer<typeof persistCardSchema>;

export class PersistCardError extends Error {
  readonly issues: z.core.$ZodIssue[];

  constructor(error: z.ZodError) {
    super(error.issues.map((issue) => issue.message).join("; ") || "cannot persist card");
    this.name = "PersistCardError";
    this.issues = error.issues;
  }
}

export function assertCanPersistCard(input: unknown): PersistCardInput {
  const parsed = persistCardSchema.safeParse(input);
  if (!parsed.success) {
    throw new PersistCardError(parsed.error);
  }
  return parsed.data;
}
