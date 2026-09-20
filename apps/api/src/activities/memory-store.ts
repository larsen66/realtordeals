import { randomUUID } from "node:crypto";
import type { Activity } from "@rieltordeals/domain";
import type { ActivityStore } from "./store.js";

// Isolated test store; the running CRM always uses Supabase.
export function createMemoryActivityStore(): ActivityStore {
  const rows = new Map<string, Activity>();
  return {
    async list() { return structuredClone([...rows.values()]); },
    async get(id) { return structuredClone(rows.get(id) ?? null); },
    async insert(input) {
      const now = new Date().toISOString();
      const activity = { ...input, id: randomUUID(), completedAt: null, createdAt: now, updatedAt: now };
      rows.set(activity.id, activity);
      return structuredClone(activity);
    },
    async update(id, patch, expectedUpdatedAt) {
      const current = rows.get(id);
      if (!current || current.updatedAt !== expectedUpdatedAt) return null;
      const updated = { ...current, ...patch, updatedAt: new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString() };
      rows.set(id, updated);
      return structuredClone(updated);
    },
  };
}
