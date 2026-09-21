import type { DraftStore } from "./draft.js";
import { createMemoryDraftStore } from "./memory-store.js";
import { createSupabaseDraftStore } from "./supabase-store.js";

let store: DraftStore | null = null;

export function setDraftStore(next: DraftStore) {
  store = next;
}

export function getDraftStore(): DraftStore {
  if (!store) {
    store = process.env.USE_MEMORY_STORE === "true"
      ? createMemoryDraftStore()
      : createSupabaseDraftStore();
  }
  return store;
}
