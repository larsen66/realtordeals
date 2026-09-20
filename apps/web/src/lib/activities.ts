import type { Activity, ActivityInput } from "@rieltordeals/domain";
import { apiJson } from "./api";

export function listActivities() { return apiJson<{ activities: Activity[] }>("/activities"); }
export function createActivity(input: ActivityInput) {
  return apiJson<{ activity: Activity }>("/activities", { method: "POST", body: JSON.stringify(input) });
}
export function updateActivity(activity: Activity, patch: { scheduledAt?: string; notes?: string; completed?: boolean }) {
  return apiJson<{ activity: Activity }>(`/activities/${activity.id}`, {
    method: "PATCH", body: JSON.stringify({ ...patch, expectedUpdatedAt: activity.updatedAt }),
  });
}

// The planner and monthly counters use Moscow time, independent of server/browser timezone.
export function activityLocalTime(value: string) {
  const date = new Date(new Date(value).getTime() + 3 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}
export function activityTimestamp(value: string) { return new Date(`${value}:00+03:00`).toISOString(); }
