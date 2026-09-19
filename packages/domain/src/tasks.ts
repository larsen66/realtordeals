import { z } from "zod";

export const taskTypeSchema = z.enum(["selection", "viewing", "mortgage", "call", "other"]);
export const taskTypeLabels = {
  selection: "Подобрать варианты",
  viewing: "Организовать показ",
  mortgage: "Подать на ипотеку",
  call: "Позвонить клиенту",
  other: "Другая задача",
} as const;

export const createTaskSchema = z.object({
  type: taskTypeSchema,
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000).default(""),
  dueAt: z.iso.datetime({ offset: true }).nullable().default(null),
});

export const cardTaskSchema = createTaskSchema.extend({
  id: z.string().uuid(),
  completedAt: z.iso.datetime({ offset: true }).nullable(),
});

export type CardTask = z.infer<typeof cardTaskSchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;

export function cardTasks(fields: Record<string, unknown>): CardTask[] {
  const tasks = z.array(cardTaskSchema).parse(fields.tasks ?? []);
  // Older cards store a single taskTitle. Give it a stable ID within its card;
  // the first task write persists it alongside the new tasks without a data migration.
  const previousId = "00000000-0000-4000-8000-000000000000";
  if (typeof fields.taskTitle === "string" && fields.taskTitle.trim() && !tasks.some((task) => task.id === previousId)) {
    tasks.unshift({ id: previousId, type: "other", title: fields.taskTitle.trim(),
      notes: "", dueAt: null, completedAt: null });
  }
  return tasks;
}
