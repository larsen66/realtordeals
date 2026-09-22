import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient } from "../lib/supabase.js";
import { cardFromRow, cardToInsertRow, type CardRow } from "./map.js";
import type { CardStore } from "./types.js";

export function createSupabaseStore(
  client: SupabaseClient = createSupabaseClient(),
): CardStore {
  return {
    async list(filters) {
      let query = client
        .from("cards")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters.role) {
        query = query.eq("role", filters.role);
      }
      if (filters.temperature) {
        query = query.eq("temperature", filters.temperature);
      }
      if (filters.stage) {
        query = query.eq("stage", filters.stage);
      }

      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return (data as CardRow[]).map(cardFromRow);
    },

    async getById(id) {
      const { data, error } = await client
        .from("cards")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data ? cardFromRow(data as CardRow) : null;
    },

    async insert(input) {
      const { data, error } = await client
        .from("cards")
        .insert(cardToInsertRow(input))
        .select("*")
        .single();
      if (error) {
        throw error;
      }
      return cardFromRow(data as CardRow);
    },

    async update(id, patch, expectedUpdatedAt) {
      const row: Record<string, unknown> = {};
      if (patch.role !== undefined) row.role = patch.role;
      if (patch.dealType !== undefined) row.deal_type = patch.dealType;
      if (patch.phone !== undefined) row.phone = patch.phone;
      if (patch.name !== undefined) row.name = patch.name;
      if (patch.objectType !== undefined) row.object_type = patch.objectType;
      if (patch.address !== undefined) row.address = patch.address;
      if (patch.source !== undefined) row.source = patch.source;
      if (patch.budget !== undefined) row.budget = patch.budget;
      if (patch.temperature !== undefined) row.temperature = patch.temperature;
      if (patch.payment !== undefined) row.payment = patch.payment;
      if (patch.stage !== undefined) row.stage = patch.stage;
      if (patch.selectionStatus !== undefined) {
        row.selection_status = patch.selectionStatus;
      }
      if (patch.referralStatus !== undefined) {
        row.referral_status = patch.referralStatus;
      }
      if (patch.birthday !== undefined) row.birthday = patch.birthday;
      if (patch.sourceText !== undefined) row.source_text = patch.sourceText;
      if (patch.promisedCallAt !== undefined) {
        row.promised_call_at = patch.promisedCallAt;
      }
      if (patch.fields !== undefined) row.fields = patch.fields;

      let query = client
        .from("cards")
        .update(row)
        .eq("id", id);
      if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
      const { data, error } = await query
        .select("*")
        .maybeSingle();
      if (error) {
        throw error;
      }
      return data ? cardFromRow(data as CardRow) : null;
    },

    async delete(id) {
      const { error, count } = await client
        .from("cards")
        .delete({ count: "exact" })
        .eq("id", id);
      if (error) {
        throw error;
      }
      return count === 1;
    },
  };
}
