import { randomUUID } from "node:crypto";
import { getCardStore } from "../cards/store.js";
import { candidateFromCard, emptyCandidate, type DraftRecord, type DraftStore } from "./draft.js";

export function createMemoryDraftStore(): DraftStore {
  const drafts = new Map<string, DraftRecord>();
  const activeDrafts = new Map<string, string>();
  const createRequests = new Map<string, string>();

  return {
    async current(ownerKey) {
      const id = activeDrafts.get(ownerKey);
      return id ? drafts.get(id) ?? null : null;
    },
    async create(ownerKey, role, requestId, card) {
      const key = `${ownerKey}:${requestId}`;
      const existingId = createRequests.get(key);
      if (existingId) return drafts.get(existingId)!;
      const draft: DraftRecord = {
        id: randomUUID(), ownerKey, role, revision: 0, status: "collecting",
        targetCardId: card?.id, targetUpdatedAt: card?.updatedAt,
        candidate: card ? candidateFromCard(card) : emptyCandidate(), sourceTexts: [], processedUpdates: [], cardId: null,
      };
      drafts.set(draft.id, draft);
      activeDrafts.set(ownerKey, draft.id);
      createRequests.set(key, draft.id);
      return draft;
    },
    async get(ownerKey, id) {
      const draft = drafts.get(id);
      return draft?.ownerKey === ownerKey ? draft : null;
    },
    async save(draft, expectedRevision) {
      const current = drafts.get(draft.id);
      if (!current || current.ownerKey !== draft.ownerKey || current.revision !== expectedRevision) return null;
      drafts.set(draft.id, draft);
      return draft;
    },
    async confirm(ownerKey, id, revision, input) {
      const draft = drafts.get(id);
      if (!draft || draft.ownerKey !== ownerKey) return { status: "not_found" };
      if (draft.status === "confirmed") return { status: "ok", draft };
      if (draft.revision !== revision) return { status: "conflict" };
      const card = draft.targetCardId
        ? await getCardStore().update(draft.targetCardId, input, draft.targetUpdatedAt!)
        : await getCardStore().insert(input);
      if (!card) return { status: "conflict" };
      const confirmed = { ...draft, status: "confirmed" as const, cardId: card.id };
      drafts.set(id, confirmed);
      return { status: "ok", draft: confirmed };
    },
  };
}
