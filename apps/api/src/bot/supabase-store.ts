import type { SupabaseClient } from "@supabase/supabase-js";
import { cardToInsertRow } from "../cards/map.js";
import { createSupabaseClient } from "../lib/supabase.js";
import { candidateFromCard, candidateSchema, type DraftRecord, type DraftStore } from "./draft.js";

type DraftRow = {
  id: string;
  owner_key: string;
  revision: number;
  role: DraftRecord["role"];
  status: DraftRecord["status"];
  candidate: unknown;
  source_texts: unknown;
  processed_updates: unknown;
  card_id: string | null;
  target_card_id: string | null;
  target_updated_at: string | null;
};

function fromRow(row: DraftRow): DraftRecord {
  const sourceTexts = Array.isArray(row.source_texts) && row.source_texts.every(value => typeof value === "string")
    ? row.source_texts : [];
  const processedUpdates = Array.isArray(row.processed_updates)
    && row.processed_updates.every(value => Number.isSafeInteger(value) && Number(value) >= 0)
    ? row.processed_updates as number[] : [];
  return {
    id: row.id,
    ownerKey: row.owner_key,
    revision: row.revision,
    role: row.role,
    status: row.status,
    candidate: candidateSchema.parse(row.candidate),
    sourceTexts,
    processedUpdates,
    cardId: row.card_id,
    targetCardId: row.target_card_id,
    targetUpdatedAt: row.target_updated_at,
  };
}

function one(value: unknown): DraftRow | null {
  const row = Array.isArray(value) ? value[0] : value;
  return row && typeof row === "object" ? row as DraftRow : null;
}

export function createSupabaseDraftStore(client: SupabaseClient = createSupabaseClient()): DraftStore {
  const get = async (ownerKey: string, id: string) => {
    const { data, error } = await client.from("bot_drafts").select("*")
      .eq("owner_key", ownerKey).eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? fromRow(data as DraftRow) : null;
  };

  return {
    async current(ownerKey) {
      const { data, error } = await client.from("bot_drafts").select("*")
        .eq("owner_key", ownerKey).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data ? fromRow(data as DraftRow) : null;
    },
    async create(ownerKey, role, requestId, card) {
      const { data, error } = await client.rpc(card ? "create_bot_edit_draft" : "create_bot_draft", {
        p_owner_key: ownerKey, p_role: role, p_request_id: requestId,
        ...(card ? { p_target_card_id: card.id, p_target_updated_at: card.updatedAt, p_candidate: candidateFromCard(card) } : {}),
      });
      if (error) throw error;
      const row = one(data);
      if (!row) throw new Error("create_bot_draft returned no row");
      return fromRow(row);
    },
    get,
    async save(draft, expectedRevision) {
      const { data, error } = await client.from("bot_drafts").update({
        candidate: draft.candidate,
        source_texts: draft.sourceTexts,
        processed_updates: draft.processedUpdates,
        revision: draft.revision,
      }).eq("owner_key", draft.ownerKey).eq("id", draft.id).eq("revision", expectedRevision)
        .select("*").maybeSingle();
      if (error) throw error;
      return data ? fromRow(data as DraftRow) : null;
    },
    async confirm(ownerKey, id, revision, card) {
      const current = await get(ownerKey, id);
      if (!current) return { status: "not_found" };
      if (current.status === "confirmed") return { status: "ok", draft: current };
      if (current.revision !== revision) return { status: "conflict" };
      const { data, error } = await client.rpc("confirm_bot_draft", {
        p_owner_key: ownerKey,
        p_draft_id: id,
        p_revision: revision,
        p_card: cardToInsertRow(card),
      });
      if (error) throw error;
      const row = one(data);
      return row ? { status: "ok", draft: fromRow(row) } : { status: "conflict" };
    },
  };
}
