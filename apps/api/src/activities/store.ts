import type { Activity, ActivityInput } from "@rieltordeals/domain";
import { createSupabaseClient } from "../lib/supabase.js";

export type ActivityPatch = Partial<Pick<Activity, "scheduledAt" | "notes" | "completedAt">>;
export interface ActivityStore {
  list(): Promise<Activity[]>;
  get(id: string): Promise<Activity | null>;
  insert(input: ActivityInput): Promise<Activity>;
  update(id: string, patch: ActivityPatch, expectedUpdatedAt: string): Promise<Activity | null>;
}
type Row = {
  id: string; type: Activity["type"]; scheduled_at: string; notes: string;
  completed_at: string | null; created_at: string; updated_at: string;
};
function fromRow(row: Row): Activity {
  return { id: row.id, type: row.type, scheduledAt: row.scheduled_at, notes: row.notes,
    completedAt: row.completed_at, createdAt: row.created_at, updatedAt: row.updated_at };
}

export function createActivityStore(): ActivityStore {
  const client = createSupabaseClient();
  return {
    async list() {
      const { data, error } = await client.from("activities").select("*").order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data as Row[]).map(fromRow);
    },
    async get(id) {
      const { data, error } = await client.from("activities").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? fromRow(data as Row) : null;
    },
    async insert(input) {
      const { data, error } = await client.from("activities").insert({
        type: input.type, scheduled_at: input.scheduledAt, notes: input.notes,
      }).select("*").single();
      if (error) throw error;
      return fromRow(data as Row);
    },
    async update(id, patch, expectedUpdatedAt) {
      const row: Partial<Row> = {};
      if (patch.scheduledAt !== undefined) row.scheduled_at = patch.scheduledAt;
      if (patch.notes !== undefined) row.notes = patch.notes;
      if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
      const { data, error } = await client.from("activities").update(row)
        .eq("id", id).eq("updated_at", expectedUpdatedAt).select("*").maybeSingle();
      if (error) throw error;
      return data ? fromRow(data as Row) : null;
    },
  };
}

let store: ActivityStore | undefined;
export function setActivityStore(value: ActivityStore) { store = value; }
export function getActivityStore() { return store ??= createActivityStore(); }
