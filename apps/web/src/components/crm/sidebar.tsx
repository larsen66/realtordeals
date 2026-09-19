"use client";

import {
  Bell,
  Building2,
  Eye,
  Handshake,
  LayoutDashboard,
  Layers,
  ListTodo,
  Plus,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

type Item = {
  href: string;
  label: string;
  icon: typeof Users;
  count?: number;
};

export function Sidebar({
  buyers,
  tasks,
  reminders,
}: {
  buyers: number | null;
  tasks: number | null;
  reminders: number | null;
}) {
  const path = usePathname();
  const search = useSearchParams();

  const items: Item[] = [
    {
      href: "/crm",
      label: "Обзор",
      icon: LayoutDashboard,
    },
    {
      href: "/crm/buyers",
      label: "Покупатели",
      icon: Users,
      count: buyers ?? undefined,
    },
    {
      href: "/crm/sellers",
      label: "Продавцы",
      icon: UserRound,
    },
    {
      href: "/crm/selections",
      label: "Подборки",
      icon: Layers,
    },
    {
      href: "/crm/viewings",
      label: "Показы",
      icon: Eye,
    },
    {
      href: "/crm/tasks",
      label: "Задачи",
      icon: ListTodo,
      count: tasks ?? undefined,
    },
    {
      href: "/crm/reminders",
      label: "Напоминания",
      icon: Bell,
      count: reminders ?? undefined,
    },
    {
      href: "/crm/deals",
      label: "Сделки",
      icon: Handshake,
    },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border bg-card md:w-[240px] md:border-r md:border-b-0">
      <div className="px-5 py-4 md:pt-5 md:pb-6">
        <div className="flex items-center justify-between gap-2">
          <Link href="/crm" className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Building2 aria-hidden="true" className="size-4" />
            </span>
            <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              rieltordeals
            </span>
          </Link>
          <ThemeToggle />
        </div>
        <p className="mt-4 hidden text-xs leading-5 text-muted-foreground md:block">
          Покупатели, продавцы и работа по сделкам
        </p>
      </div>

      <div className="px-3 pb-4">
        <Link
          href="/crm/cards/new?role=buyer"
          className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus aria-hidden="true" className="size-4 shrink-0" />
          Добавить покупателя
        </Link>
      </div>

      <nav aria-label="Разделы CRM" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col">
        {items.map((item) => {
          const active = path === item.href ||
            (path === "/crm/cards/new" &&
              item.href === (search.get("role") === "seller" ? "/crm/sellers" : "/crm/buyers"));
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
              )}
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.count ? (
                <span className="text-xs text-muted-foreground tabular-nums">{item.count}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden border-t border-border px-5 py-4 md:block">
        <p className="text-sm font-medium text-foreground">Иван Кузнецов</p>
        <p className="mt-1 text-xs text-muted-foreground">Агентство «Кадастр»</p>
      </div>
    </aside>
  );
}
