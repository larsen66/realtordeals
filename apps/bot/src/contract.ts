import { z } from "zod";

// Transport/display DTOs only. CRM field definitions and validation belong to
// packages/domain and the API; the bot must not invent a second domain schema.
export const draftIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,36}$/);
export const roleSchema = z.enum(["buyer", "seller"]);
export type Role = z.infer<typeof roleSchema>;
const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().nullable(),
});
export const draftSchema = z.object({
  id: draftIdSchema,
  revision: z.number().int().nonnegative().max(2147483647),
  role: roleSchema,
  status: z.enum(["collecting", "processing", "needs_input", "ready", "confirmed"]),
  fields: z.array(fieldSchema),
  issues: z.array(z.string()),
  notes: z.array(z.string()),
  canConfirm: z.boolean(),
  cardId: z.string().min(1).nullable(),
  targetCardId: z.string().nullable().optional(),
}).superRefine((d, ctx) => {
  if (d.canConfirm && (d.status !== "ready" || d.issues.length > 0)) {
    ctx.addIssue({ code: "custom", message: "Inconsistent confirmation state" });
  }
  if (d.status === "confirmed" && !d.cardId) {
    ctx.addIssue({ code: "custom", message: "Confirmed draft requires cardId" });
  }
});
export type Draft = z.infer<typeof draftSchema>;
export type Actor = { telegramUserId: number; chatId: number };
export type InputMessage =
  | { kind: "text"; text: string; messageId: number; updateId: number; extraction?: unknown }
  | { kind: "voice"; fileId: string; fileUniqueId: string; size: number | null;
      duration: number; mimeType: string; messageId: number; updateId: number };

export const clientSchema = z.object({ id: z.uuid(), name: z.string().nullable(), phone: z.string(), role: roleSchema });
export type Client = z.infer<typeof clientSchema>;

export interface CrmGateway {
  searchClients?(actor: Actor, phone: string): Promise<Client[]>;
  editClient?(actor: Actor, id: string, requestId: string): Promise<Draft>;
  readonly mode: "demo" | "api";
  current(actor: Actor): Promise<Draft | null>;
  create(actor: Actor, role: Role, requestId: string): Promise<Draft>;
  get(actor: Actor, id: string): Promise<Draft>;
  submit(actor: Actor, id: string, input: InputMessage): Promise<Draft>;
  confirm(actor: Actor, id: string, revision: number): Promise<Draft>;
}

export class GatewayError extends Error {
  constructor(readonly code: "unavailable" | "conflict" | "invalid" | "forbidden" | "not_found") {
    super(code); // Do not carry raw HTTP bodies, client details or credentials.
  }
}
