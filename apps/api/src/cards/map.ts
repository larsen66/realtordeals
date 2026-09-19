import { tagsFor, type CardRole, type DealType } from "@rieltordeals/domain";
import type { CardDto, CardInsert } from "./types.js";

export type CardRow = {
  id: string;
  role: CardRole;
  deal_type: DealType;
  phone: string;
  name: string | null;
  object_type: string | null;
  address: string | null;
  source: string | null;
  budget: string | null;
  temperature: CardDto["temperature"];
  payment: CardDto["payment"];
  stage: CardDto["stage"];
  selection_status: CardDto["selectionStatus"];
  referral_status: CardDto["referralStatus"];
  birthday: string | null;
  source_text: string | null;
  promised_call_at: string | null;
  fields: CardDto["fields"];
  created_at: string;
  updated_at: string;
};

export function cardFromRow(row: CardRow): CardDto {
  return {
    id: row.id,
    role: row.role,
    dealType: row.deal_type,
    phone: row.phone,
    name: row.name,
    objectType: row.object_type,
    address: row.address,
    source: row.source,
    budget: row.budget,
    temperature: row.temperature,
    payment: row.payment,
    stage: row.stage,
    selectionStatus: row.selection_status,
    referralStatus: row.referral_status,
    birthday: row.birthday,
    sourceText: row.source_text,
    promisedCallAt: row.promised_call_at,
    fields: row.fields,
    tags: tagsFor(row.role, row.deal_type),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function cardToInsertRow(input: CardInsert) {
  return {
    role: input.role,
    deal_type: input.dealType,
    phone: input.phone,
    name: input.name,
    object_type: input.objectType,
    address: input.address,
    source: input.source,
    budget: input.budget,
    temperature: input.temperature,
    payment: input.payment,
    stage: input.stage,
    selection_status: input.selectionStatus,
    referral_status: input.referralStatus,
    birthday: input.birthday,
    source_text: input.sourceText,
    promised_call_at: input.promisedCallAt,
    fields: input.fields,
  };
}
