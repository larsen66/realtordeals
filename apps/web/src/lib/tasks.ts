import { cardTasks, type TaskType } from "@rieltordeals/domain";
import { apiJson } from "./api";
import { formatWhen, fieldString, type Card } from "./cards";

export type TaskTab = "all" | "today" | "overdue" | TaskType | "completed";
export type Task = {
  id: string; cardId: string; type: TaskType; kind: "stored" | "selection" | "call";
  title: string; client: string; phone: string; notes: string; request: string;
  dueAt: string | null; dueLabel: string; completedAt: string | null;
  overdue: boolean;
  temperature: Card["temperature"];
  stage: Card["stage"];
};

export function buyerRequest(card: Card) {
  return [card.budget, fieldString(card, "purchaseWhat") ?? card.objectType,
    fieldString(card, "layout"), fieldString(card, "location")].filter(Boolean).join(" · ");
}

export function tasksFromCards(cards: Card[]): Task[] {
  const now = Date.now();
  return cards.flatMap((card) => {
    const shared = { cardId: card.id, client: card.name || card.phone, phone: card.phone,
      temperature: card.temperature, stage: card.stage, request: buyerRequest(card) };
    const tasks: Task[] = cardTasks(card.fields).map((task) => ({
      ...shared, ...task, kind: "stored", dueLabel: task.dueAt ? formatWhen(task.dueAt) : "Без срока",
      overdue: !task.completedAt && Boolean(task.dueAt && Date.parse(task.dueAt) < now),
    }));
    if (card.promisedCallAt) {
      tasks.push({ ...shared, id: "call:" + card.id, type: "call", kind: "call",
        title: "Обещанный звонок", notes: "", dueAt: card.promisedCallAt,
        dueLabel: formatWhen(card.promisedCallAt), completedAt: null,
        overdue: Date.parse(card.promisedCallAt) < now });
    }
    if (card.role === "buyer" && card.stage === "selection" && card.selectionStatus !== "awaiting_reply" &&
        !tasks.some((task) => task.type === "selection" && !task.completedAt)) {
      tasks.push({ ...shared, id: "selection:" + card.id, type: "selection", kind: "selection",
        title: "Ожидает подборку", notes: fieldString(card, "selectionNotes") ?? "",
        dueAt: null, dueLabel: "Без срока", completedAt: null, overdue: false });
    }
    return tasks;
  }).sort((a, b) => {
    if (Boolean(a.completedAt) !== Boolean(b.completedAt)) return a.completedAt ? 1 : -1;
    return (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") || a.client.localeCompare(b.client, "ru");
  });
}

export function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export function filterTasks(tasks: Task[], tab: TaskTab): Task[] {
  if (tab === "completed") return tasks.filter((task) => task.completedAt);
  const open = tasks.filter((task) => !task.completedAt);
  if (tab === "all") return open;
  if (tab === "today") return open.filter((task) => task.dueAt && isToday(task.dueAt));
  if (tab === "overdue") return open.filter((task) => task.overdue);
  return open.filter((task) => task.type === tab);
}

export const taskTabs: { id: TaskTab; label: string }[] = [
  { id: "all", label: "Все задачи" }, { id: "today", label: "Сегодня" },
  { id: "overdue", label: "Просрочены" }, { id: "selection", label: "Подобрать" },
  { id: "viewing", label: "Показ" }, { id: "mortgage", label: "Ипотека" },
  { id: "call", label: "Звонки" }, { id: "completed", label: "Выполнены" },
];

export function isTaskTab(value: string | undefined): value is TaskTab {
  return taskTabs.some((tab) => tab.id === value);
}

export function taskStats(tasks: Task[]) {
  return { total: filterTasks(tasks, "all").length, today: filterTasks(tasks, "today").length,
    selection: filterTasks(tasks, "selection").length, viewing: filterTasks(tasks, "viewing").length };
}

export function createTask(cardId: string, body: unknown) {
  return apiJson<{ card: Card }>(`/cards/${cardId}/tasks`, { method: "POST", body: JSON.stringify(body) });
}

export function completeTask(cardId: string, taskId: string, completed: boolean) {
  return apiJson<{ card: Card }>(`/cards/${cardId}/tasks/${taskId}`, {
    method: "PATCH", body: JSON.stringify({ completed }),
  });
}

export function completePromisedCall(cardId: string, expectedDueAt: string | null) {
  return apiJson<{ card: Card }>(`/cards/${cardId}/promised-call/complete`, {
    method: "POST", body: JSON.stringify({ expectedDueAt }),
  });
}
