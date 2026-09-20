import { z } from "zod";

export const activityTypes = ["flyers", "telegram", "promo_stand"] as const;
export const activityLabels = {
  flyers: "Расклейка",
  telegram: "Реклама в Telegram",
  promo_stand: "Промо стойка",
} as const;
export const createActivitySchema = z.object({
  type: z.enum(activityTypes),
  scheduledAt: z.iso.datetime({ offset: true }),
  notes: z.string().trim().max(5000).default(""),
}).strict();
export const patchActivitySchema = z.object({
  scheduledAt: createActivitySchema.shape.scheduledAt.optional(),
  notes: z.string().trim().max(5000).optional(),
  completed: z.boolean().optional(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
}).strict().refine(value => value.scheduledAt !== undefined || value.notes !== undefined || value.completed !== undefined,
  "Укажите дату, комментарий или выполнение активности");
export type ActivityType = typeof activityTypes[number];
export type ActivityInput = z.infer<typeof createActivitySchema>;
export type Activity = ActivityInput & {
  id: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const activityTimeZone = "Europe/Moscow";
export function activityMonth(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: activityTimeZone, year: "numeric", month: "2-digit",
  }).formatToParts(new Date(value));
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}

export function activityCounts(activities: Activity[], now = new Date()) {
  const month = activityMonth(now);
  return Object.fromEntries(activityTypes.map(type => [type,
    activities.filter(item => item.type === type && item.completedAt && activityMonth(item.completedAt) === month).length,
  ])) as Record<ActivityType, number>;
}
