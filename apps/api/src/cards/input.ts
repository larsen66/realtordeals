import {
  buyerStageSchema,
  cardRoleSchema,
  parseCreateCardInput,
  parsePatchCardInput,
  temperatureSchema,
} from "@rieltordeals/domain";
import { CardValidationError } from "@rieltordeals/domain";
import type { CardDto, CardFilters, CardInsert, CardPatch } from "./types.js";

function emptyToNull(value: string | null | undefined) {
  return value === undefined ? null : value;
}

export function toCardInsert(
  parsed: ReturnType<typeof parseCreateCardInput>,
): CardInsert {
  return {
    role: parsed.role,
    dealType: parsed.dealType,
    phone: parsed.phone,
    name: parsed.name ?? null,
    objectType: parsed.objectType ?? null,
    address: parsed.address ?? null,
    source: parsed.source ?? null,
    budget: parsed.budget ?? null,
    temperature: parsed.temperature ?? null,
    payment: parsed.payment,
    stage: parsed.stage,
    selectionStatus: parsed.selectionStatus,
    referralStatus: parsed.referralStatus,
    birthday: parsed.birthday ?? null,
    sourceText: parsed.sourceText ?? null,
    promisedCallAt: parsed.promisedCallAt ?? null,
    fields: parsed.fields,
  };
}

export function toCardPatch(parsed: ReturnType<typeof parsePatchCardInput>): CardPatch {
  const patch: CardPatch = {};
  if (parsed.role !== undefined) patch.role = parsed.role;
  if (parsed.dealType !== undefined) patch.dealType = parsed.dealType;
  if (parsed.phone !== undefined) patch.phone = parsed.phone;
  if (parsed.name !== undefined) patch.name = emptyToNull(parsed.name);
  if (parsed.objectType !== undefined) patch.objectType = emptyToNull(parsed.objectType);
  if (parsed.address !== undefined) patch.address = emptyToNull(parsed.address);
  if (parsed.source !== undefined) patch.source = emptyToNull(parsed.source);
  if (parsed.budget !== undefined) patch.budget = emptyToNull(parsed.budget);
  if (parsed.temperature !== undefined) patch.temperature = parsed.temperature;
  if (parsed.payment !== undefined) patch.payment = parsed.payment;
  if (parsed.stage !== undefined) patch.stage = parsed.stage;
  if (parsed.selectionStatus !== undefined) {
    patch.selectionStatus = parsed.selectionStatus;
  }
  if (parsed.referralStatus !== undefined) {
    patch.referralStatus = parsed.referralStatus;
  }
  if (parsed.birthday !== undefined) patch.birthday = emptyToNull(parsed.birthday);
  if (parsed.sourceText !== undefined) patch.sourceText = emptyToNull(parsed.sourceText);
  if (parsed.promisedCallAt !== undefined) {
    patch.promisedCallAt = parsed.promisedCallAt;
  }
  if (parsed.fields !== undefined) patch.fields = parsed.fields;
  return patch;
}

function optionalQuery<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } },
  value: unknown,
  path: string,
): T | undefined {
  if (value == null || value === "") {
    return undefined;
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new CardValidationError(`invalid ${path}`, [
      { path, message: `invalid ${path}` },
    ]);
  }
  return parsed.data;
}

export function parseCardFilters(query: {
  role?: unknown;
  temperature?: unknown;
  stage?: unknown;
}): CardFilters {
  return {
    role: optionalQuery(cardRoleSchema, query.role, "role"),
    temperature: optionalQuery(temperatureSchema, query.temperature, "temperature"),
    stage: optionalQuery(buyerStageSchema, query.stage, "stage"),
  };
}

export function parseNewCard(body: unknown) {
  return toCardInsert(parseCreateCardInput(body));
}

export function parseCardPatch(
  body: unknown,
  current: Pick<
    CardDto,
    "role" | "stage" | "selectionStatus" | "referralStatus"
  >,
) {
  return toCardPatch(parsePatchCardInput(body, current));
}
