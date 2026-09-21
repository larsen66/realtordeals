import { GatewayError, type Actor, type CrmGateway, type Draft, type InputMessage, type Role } from "../contract.js";

// Disposable UI fixture, NOT the CRM schema, database or an AI replacement.
// Never imported by API mode. All supplied examples must be fictional.
export class DemoCrmGateway implements CrmGateway {
  readonly mode = "demo" as const;
  private drafts = new Map<string, { owner: string; draft: Draft }>();
  private active = new Map<string, string>();
  private requests = new Map<string, string>();
  private messages = new Set<string>();
  private nextId = 1;
  private confirmed = new Set<string>();
  get confirmedCount() { return this.confirmed.size; }
  private owner(a: Actor) { return `${a.telegramUserId}:${a.chatId}`; }

  async current(actor: Actor) {
    const id = this.active.get(this.owner(actor));
    return id ? this.get(actor, id) : null;
  }
  async create(actor: Actor, role: Role, requestId: string) {
    const owner = this.owner(actor);
    const request = `${owner}:${requestId}`;
    const old = this.requests.get(request);
    if (old) return this.get(actor, old);
    const id = `demo-${this.nextId++}`;
    const fields = [
      { key: "name", label: "Имя", value: null },
      { key: "phone", label: "Телефон", value: null },
      ...(role === "buyer" ? [{ key: "budget", label: "Бюджет", value: null }]
        : [{ key: "address", label: "Адрес", value: null }, { key: "price", label: "Цена", value: null }]),
    ];
    const draft: Draft = { id, revision: 0, role, status: "collecting", fields,
      issues: ["Телефон (учебное правило, не окончательная схема CRM)"], notes: [], canConfirm: false, cardId: null };
    this.drafts.set(id, { owner, draft });
    this.active.set(owner, id);
    this.requests.set(request, id);
    return structuredClone(draft);
  }
  async get(actor: Actor, id: string) {
    const record = this.drafts.get(id);
    if (!record || record.owner !== this.owner(actor)) throw new GatewayError("forbidden");
    return structuredClone(record.draft);
  }
  async submit(actor: Actor, id: string, input: InputMessage) {
    const draft = await this.get(actor, id);
    const key = `${this.owner(actor)}:${input.updateId}`;
    if (this.messages.has(key)) return draft;
    if (draft.status === "confirmed") throw new GatewayError("conflict");
    if (input.kind === "voice") {
      draft.notes.push("Получено голосовое. В ДЕМО аудио не скачивается и не распознается.");
      draft.issues = ["Пришлите содержание текстом. Голос требует OpenAI и worker."];
      draft.canConfirm = false;
    } else {
      for (const line of input.text.split("\n").filter((s) => s.trim())) {
        const at = line.indexOf(":");
        const label = line.slice(0, at).trim().toLowerCase();
        const field = at > 0 ? draft.fields.find((f) => f.label.toLowerCase() === label) : undefined;
        if (field) field.value = line.slice(at + 1).trim() || null;
        else draft.notes.push(line); // Unknown information is never silently discarded.
      }
      const phone = draft.fields.find((f) => f.key === "phone")?.value;
      draft.issues = phone && /^\+?[\d\s()-]{7,24}$/.test(phone)
        ? [] : ["Телефон: добавьте строку «Телефон: +7 000 000-00-00» (вымышленный пример)."];
      draft.canConfirm = draft.issues.length === 0;
    }
    draft.status = draft.canConfirm ? "ready" : "needs_input";
    draft.revision++;
    this.drafts.set(id, { owner: this.owner(actor), draft });
    this.messages.add(key);
    return structuredClone(draft);
  }
  async confirm(actor: Actor, id: string, revision: number) {
    const draft = await this.get(actor, id);
    if (draft.status === "confirmed") return draft;
    if (draft.revision !== revision || !draft.canConfirm || draft.status !== "ready") throw new GatewayError("conflict");
    draft.status = "confirmed";
    draft.canConfirm = false;
    draft.cardId = `demo-only-${id}`;
    this.confirmed.add(id);
    this.drafts.set(id, { owner: this.owner(actor), draft });
    return structuredClone(draft);
  }
}
