"use client";

import Link from "next/link";
import { stageLabels } from "@rieltordeals/domain";
import type { Task } from "@/lib/tasks";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "./status-pill";
import { stageTone } from "./status-tones";


const columns = ["Задача", "Клиент", "Срок", "Этап", "Статус"];

export function TaskTable({ tasks }: { tasks: Task[] }) {
  return (
    <Table aria-label="Задачи клиентов" className="min-w-[680px]">
      <TableHeader className="bg-muted/50">
        <TableRow className="hover:bg-transparent">
          {columns.map((column) => (
            <TableHead
              key={column}
              scope="col"
              className="h-11 px-5 text-xs font-medium text-muted-foreground"
            >
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.length ? tasks.map((task) => (
          <TaskItem key={`${task.cardId}:${task.id}`} task={task} />
        )) : (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columns.length} className="px-6 py-14 text-center text-sm text-muted-foreground">
              Нет задач по выбранным условиям.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function TaskItem({ task }: { task: Task }) {
  return (
    <TableRow className="border-border/60">
      <TableCell className="min-w-44 max-w-80 px-5 py-3.5 whitespace-normal">
        <p className={`text-sm font-medium break-words ${task.completedAt ? "text-muted-foreground line-through" : "text-foreground"}`}>
          {task.title}
        </p>
      </TableCell>
      <TableCell className="min-w-32 max-w-64 px-5 py-3.5 whitespace-normal">
        <Link href={`/crm/cards/${task.cardId}`} className="text-sm font-medium break-words underline-offset-4 hover:underline">
          {task.client}
        </Link>
      </TableCell>
      <TableCell className="px-5 py-3.5 tabular-nums">
        {task.dueAt ? (
          <time dateTime={task.dueAt}>
            <StatusPill tone={task.overdue ? "red" : "green"}>{task.dueLabel}</StatusPill>
          </time>
        ) : (
          <StatusPill tone="gray">{task.dueLabel}</StatusPill>
        )}
      </TableCell>
      <TableCell className="px-5 py-3.5">
        {task.stage ? <StatusPill tone={stageTone(task.stage)}>{stageLabels[task.stage]}</StatusPill> : <span className="text-muted-foreground">-</span>}
      </TableCell>
      <TableCell className="px-5 py-3.5">
        <StatusPill tone={task.completedAt ? "green" : task.overdue ? "red" : "gray"}>
          {task.completedAt ? "Выполнена" : task.overdue ? "Просрочена" : "В работе"}
        </StatusPill>
      </TableCell>
    </TableRow>
  );
}
