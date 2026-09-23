"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ListTodo, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PersonalTask = {
  id: string;
  title: string;
  completed: boolean;
};

const STORAGE_KEY = "rieltordeals.personal-tasks";

export function PersonalTasks() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [tasks, setTasks] = useState<PersonalTask[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PersonalTask[];
        if (Array.isArray(parsed)) queueMicrotask(() => setTasks(parsed));
      }
    } catch {
      // Local storage can be unavailable in private browsing; the list still works for this session.
    } finally {
      queueMicrotask(() => { loaded.current = true; });
    }
  }, []);

  useEffect(() => {
    if (loaded.current) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    setTasks((current) => [{ id: crypto.randomUUID(), title: trimmedTitle, completed: false }, ...current]);
    setTitle("");
  }

  function toggleTask(id: string) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  }

  const activeTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <ListTodo aria-hidden="true" />
        Личные задачи
        {activeTasks.length > 0 && <span className="ml-1 rounded-full bg-primary/10 px-1.5 text-xs">{activeTasks.length}</span>}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="personal-tasks-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <header className="flex items-start justify-between border-b border-border px-5 py-4">
              <div>
                <h2 id="personal-tasks-title" className="text-lg font-semibold">Личные задачи</h2>
                <p className="mt-1 text-sm text-muted-foreground">Ваш список дел, который виден только в этом браузере</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Закрыть окно" onClick={() => setOpen(false)}><X aria-hidden="true" /></Button>
            </header>

            <div className="max-h-[min(70vh,560px)] overflow-y-auto p-5">
              <form onSubmit={addTask} className="flex gap-2">
                <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например, позвонить клиенту" maxLength={200} aria-label="Новая личная задача" />
                <Button type="submit" aria-label="Добавить личную задачу"><Plus aria-hidden="true" /> Добавить</Button>
              </form>

              {tasks.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <ListTodo className="mx-auto mb-3 size-8 opacity-40" aria-hidden="true" />
                  Пока нет личных задач. Добавьте первое дело выше.
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {activeTasks.map((task) => <PersonalTaskRow key={task.id} task={task} onToggle={toggleTask} />)}
                  {completedTasks.length > 0 && (
                    <div className="pt-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Выполнено</p>
                      <div className="space-y-2">{completedTasks.map((task) => <PersonalTaskRow key={task.id} task={task} onToggle={toggleTask} />)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function PersonalTaskRow({ task, onToggle }: { task: PersonalTask; onToggle: (id: string) => void }) {
  return (
    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 px-3 py-3 transition-colors hover:bg-muted/60 ${task.completed ? "bg-muted/30" : "bg-card"}`}>
      <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} className="peer sr-only" />
      <span className={`flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${task.completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40 text-transparent"}`} aria-hidden="true"><Check className="size-3.5" strokeWidth={3} /></span>
      <span className={`text-sm ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</span>
    </label>
  );
}
