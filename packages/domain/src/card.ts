import { z } from "zod";
import {
  buyerStageSchema,
  cardRoleSchema,
  dealTypeSchema,
  referralStatusSchema,
  selectionStatusSchema,
  temperatureSchema,
  type BuyerStage,
  type CardRole,
  type ReferralStatus,
  type SelectionStatus,
} from "./enums.js";
import { paymentSelectionSchema } from "./payments.js";
import { parseCardFields } from "./fields.js";
import { assertCanPersistCard } from "./persist.js";
import { normalizeStageStatuses } from "./stage-status.js";
import { tagsFor } from "./tags.js";

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

export const createCardInputSchema = z.object({
  role: cardRoleSchema,
  dealType: dealTypeSchema,
  phone: z.string(),
  name: optionalText,
  objectType: optionalText,
  address: optionalText,
  source: optionalText,
  budget: optionalText,
  temperature: temperatureSchema.optional().nullable(),
  payment: paymentSelectionSchema.optional(),
  stage: buyerStageSchema.optional().nullable(),
  selectionStatus: selectionStatusSchema.optional().nullable(),
  referralStatus: referralStatusSchema.optional().nullable(),
  birthday: z.preprocess((value) => {
    if (value == null || value === "") return undefined;
    return typeof value === "string" ? value.trim() || undefined : value;
  }, z.iso.date().optional()),
  sourceText: optionalText,
  promisedCallAt: z.preprocess((value) => value === "" || value == null ? undefined : value,
    z.iso.datetime({ offset: true }).optional()),
  fields: z.record(z.string(), z.unknown()).optional(),
});

export const patchCardInputSchema = createCardInputSchema.partial().extend({
  name: z.string().trim().nullable().optional(),
  objectType: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
  source: z.string().trim().nullable().optional(),
  budget: z.string().trim().nullable().optional(),
  birthday: z.iso.date().nullable().optional(),
  sourceText: z.string().nullable().optional(),
  promisedCallAt: z.iso.datetime({ offset: true }).nullable().optional(),
});

export type CreateCardInput = z.infer<typeof createCardInputSchema>;
export type PatchCardInput = z.infer<typeof patchCardInputSchema>;

export class CardValidationError extends Error {
  readonly issues: { path: string; message: string }[];

  constructor(message: string, issues: { path: string; message: string }[] = []) {
    super(message);
    this.name = "CardValidationError";
    this.issues = issues;
  }
}

export function defaultStageFor(role: CardRole): BuyerStage | null {
  return role === "buyer" ? "selection" : null;
}

function issuesFromZod(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function parseFieldsOrThrow(role: CardRole, fields: unknown) {
  try {
    return parseCardFields(role, fields);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new CardValidationError("invalid card fields", issuesFromZod(error));
    }
    throw error;
  }
}

export function parseCreateCardInput(input: unknown) {
  const parsed = createCardInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new CardValidationError("invalid card", issuesFromZod(parsed.error));
  }

  const persist = assertCanPersistCard({
    role: parsed.data.role,
    dealType: parsed.data.dealType,
    phone: parsed.data.phone,
  });

  if (persist.role === "seller" && parsed.data.stage) {
    throw new CardValidationError("seller has no buyer stage", [
      { path: "stage", message: "seller has no buyer stage" },
    ]);
  }

  const fields = parseFieldsOrThrow(persist.role, parsed.data.fields);
  const payment = parsed.data.payment ?? fields.paymentMethods ?? [];
  fields.paymentMethods = payment;
  const stage =
    persist.role === "buyer"
      ? (parsed.data.stage ?? defaultStageFor("buyer"))
      : null;
  const extras = normalizeStageStatuses({
    stage,
    selectionStatus: parsed.data.selectionStatus,
    referralStatus: parsed.data.referralStatus,
  });

  return {
    ...parsed.data,
    ...persist,
    phone: persist.phone,
    payment,
    stage,
    ...extras,
    fields,
    tags: tagsFor(persist.role, persist.dealType),
  };
}

export function parsePatchCardInput(
  input: unknown,
  current: {
    role: CardRole;
    stage: BuyerStage | null;
    selectionStatus: SelectionStatus | null;
    referralStatus: ReferralStatus | null;
  },
) {
  const parsed = patchCardInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new CardValidationError("invalid card", issuesFromZod(parsed.error));
  }

  const role = parsed.data.role ?? current.role;

  if (parsed.data.phone !== undefined) {
    assertCanPersistCard({
      role,
      dealType: parsed.data.dealType ?? "sale",
      phone: parsed.data.phone,
    });
  }

  if (role === "seller" && parsed.data.stage) {
    throw new CardValidationError("seller has no buyer stage", [
      { path: "stage", message: "seller has no buyer stage" },
    ]);
  }

  let fields =
    parsed.data.fields !== undefined
      ? parseFieldsOrThrow(role, parsed.data.fields)
      : undefined;

  const payment = parsed.data.payment ?? fields?.paymentMethods;
  if (payment !== undefined) fields = { ...fields, paymentMethods: payment };

  const stageTouched =
    parsed.data.stage !== undefined ||
    parsed.data.selectionStatus !== undefined ||
    parsed.data.referralStatus !== undefined ||
    parsed.data.role === "seller";

  const extras = stageTouched
    ? normalizeStageStatuses({
        stage: role === "seller"
          ? null
          : parsed.data.stage !== undefined ? parsed.data.stage : current.stage,
        selectionStatus:
          parsed.data.selectionStatus !== undefined
            ? parsed.data.selectionStatus
            : current.selectionStatus,
        referralStatus:
          parsed.data.referralStatus !== undefined
            ? parsed.data.referralStatus
            : current.referralStatus,
      })
    : {};

  return {
    ...parsed.data,
    role: parsed.data.role,
    payment,
    stage: role === "seller" && parsed.data.role === "seller" ? null : parsed.data.stage,
    ...extras,
    fields,
  };
}
