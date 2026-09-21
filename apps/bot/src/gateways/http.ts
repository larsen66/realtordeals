import { z } from "zod";
import { randomUUID } from "node:crypto";
import { clientSchema, draftSchema, GatewayError, type Actor, type CrmGateway, type InputMessage, type Role } from "../contract.js";

// Proposed /bot/v1 contract, documented in docs/integration/bot-api-proposal.md.
// These routes do NOT exist on the baseline API yet. No silent demo fallback.
export class HttpCrmGateway implements CrmGateway {
  readonly mode = "api" as const;
  constructor(private base: string, private token: string, private fetcher: typeof fetch = fetch) {}

  private async request<T>(actor: Actor, path: string, schema: z.ZodType<T>, body?: unknown, requestId?: string): Promise<T> {
    const traceId = randomUUID();
    const started = Date.now();
    const log = (event: string, details: Record<string, unknown> = {}) => console.log(JSON.stringify({
      time: new Date().toISOString(), service: "bot", event, requestId: traceId,
      method: body === undefined ? "GET" : "POST", route: path.replace(/\/drafts\/[^/]+/, "/drafts/:id"),
      durationMs: Date.now() - started, ...details,
    }));
    log("crm.request.start");
    try {
      const response = await this.fetcher(`${this.base}/bot/v1${path}`, {
        method: body === undefined ? "GET" : "POST",
        redirect: "error",
        signal: AbortSignal.timeout(12_000),
        headers: {
          "x-request-id": traceId,
          authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
          "x-telegram-user-id": String(actor.telegramUserId),
          "x-telegram-chat-id": String(actor.chatId),
          ...(requestId ? { "idempotency-key": requestId } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      log("crm.response", { status: response.status });
      if (!response.ok) {
        throw new GatewayError(response.status === 404 ? "not_found" : response.status === 409 ? "conflict" :
          [401, 403].includes(response.status) ? "forbidden" :
          response.status === 422 ? "invalid" : "unavailable");
      }
      const parsed = schema.safeParse(await response.json());
      if (!parsed.success) {
        log("crm.schema.invalid", { issues: parsed.error.issues.map(issue => ({ code: issue.code, path: issue.path })) });
        throw new GatewayError("invalid");
      }
      log("crm.request.complete");
      return parsed.data;
    } catch (error) {
      log("crm.request.error", { category: error instanceof GatewayError ? error.code : "network_or_response",
        timeout: error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) });
      if (error instanceof GatewayError) throw error;
      throw new GatewayError("unavailable");
    }
  }

  searchClients(actor: Actor, phone: string) {
    return this.request(actor, "/clients/search", clientSchema.array(), { phone });
  }
  editClient(actor: Actor, id: string, requestId: string) {
    return this.request(actor, `/clients/${encodeURIComponent(id)}/edit`, draftSchema, {}, requestId);
  }
  current(actor: Actor) { return this.request(actor, "/drafts/current", draftSchema.nullable()); }
  create(actor: Actor, role: Role, requestId: string) {
    return this.request(actor, "/drafts", draftSchema, { role }, requestId);
  }
  async get(actor: Actor, id: string) {
    const draft = await this.request(actor, `/drafts/${encodeURIComponent(id)}`, draftSchema);
    if (draft.id !== id) throw new GatewayError("invalid");
    return draft;
  }
  async submit(actor: Actor, id: string, input: InputMessage) {
    const draft = await this.request(actor, `/drafts/${encodeURIComponent(id)}/messages`, draftSchema, input,
      `telegram:${actor.telegramUserId}:${input.updateId}`);
    if (draft.id !== id) throw new GatewayError("invalid");
    return draft;
  }
  async confirm(actor: Actor, id: string, revision: number) {
    const draft = await this.request(actor, `/drafts/${encodeURIComponent(id)}/confirm`, draftSchema,
      { revision, confirmed: true }, `confirm:${id}:${revision}`);
    if (draft.id !== id || draft.revision !== revision) throw new GatewayError("invalid");
    return draft;
  }
}
