import { randomUUID } from "node:crypto";
import { tagsFor } from "@rieltordeals/domain";
import type { CardDto, CardStore } from "./types.js";

export function createMemoryStore(seed: CardDto[] = []): CardStore {
  const cards = new Map<string, CardDto>(seed.map((card) => [card.id, card]));

  return {
    async list(filters) {
      return [...cards.values()]
        .filter((card) => {
          if (filters.role && card.role !== filters.role) {
            return false;
          }
          if (filters.temperature && card.temperature !== filters.temperature) {
            return false;
          }
          if (filters.stage && card.stage !== filters.stage) {
            return false;
          }
          return true;
        })
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },

    async getById(id) {
      return cards.get(id) ?? null;
    },

    async insert(input) {
      const now = new Date().toISOString();
      const card: CardDto = {
        ...input,
        id: randomUUID(),
        tags: tagsFor(input.role, input.dealType),
        createdAt: now,
        updatedAt: now,
      };
      cards.set(card.id, card);
      return card;
    },

    async update(id, patch, expectedUpdatedAt) {
      const current = cards.get(id);
      if (!current || (expectedUpdatedAt && current.updatedAt !== expectedUpdatedAt)) {
        return null;
      }

      const next: CardDto = {
        ...current,
        ...patch,
        fields: patch.fields ?? current.fields,
        tags: tagsFor(patch.role ?? current.role, patch.dealType ?? current.dealType),
        updatedAt: new Date(Math.max(Date.now(), Date.parse(current.updatedAt) + 1)).toISOString(),
      };
      cards.set(id, next);
      return next;
    },
  };
}
