import { Suspense } from "react";
import { Manrope } from "next/font/google";
import { Sidebar } from "@/components/crm/sidebar";
import { listCards } from "@/lib/cards";
import { filterTasks, tasksFromCards } from "@/lib/tasks";

const sans = Manrope({
  subsets: ["cyrillic", "latin"],
  variable: "--font-crm",
});

const themeScript = `try{if(localStorage.getItem("crm-theme")==="dark"){document.currentScript.parentElement.classList.add("dark")}}catch{}`;

export default async function CrmLayout({ children, panel }: LayoutProps<"/crm">) {
  let buyers: number | null = null;
  let tasks: number | null = null;
  let reminders: number | null = null;

  try {
    const { cards } = await listCards();
    buyers = cards.filter((card) => card.role === "buyer").length;
    const openTasks = filterTasks(tasksFromCards(cards), "all");
    tasks = openTasks.length;
    reminders = openTasks.filter((task) => task.dueAt).length;
  } catch {
    // Pages display the load error; unavailable navigation counts stay hidden.
  }

  return (
    <div
      suppressHydrationWarning
      className={`${sans.variable} crm-shell flex min-h-full min-w-0 flex-1 flex-col overflow-hidden md:flex-row`}
    >
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      <Suspense>
        <Sidebar
          buyers={buyers}
          tasks={tasks}
          reminders={reminders}
        />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">{children}</div>
      {panel}
    </div>
  );
}
