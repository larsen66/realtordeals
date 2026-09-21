import { createSupabaseStore } from "./supabase-store.js";
import { createMemoryStore } from "./memory-store.js";
import type { CardStore } from "./types.js";

let store: CardStore | null = null;

export function setCardStore(next: CardStore) {
  store = next;
}

export function getCardStore(): CardStore {
  if (!store) {
    store = process.env.USE_MEMORY_STORE === "true"
      ? createMemoryStore()
      : createSupabaseStore();
  }
  return store;
}
