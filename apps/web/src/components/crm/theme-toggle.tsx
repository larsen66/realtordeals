"use client";

import { Moon, Sun } from "lucide-react";

const storageKey = "crm-theme";

export function ThemeToggle() {
  function toggleTheme() {
    const shell = document.querySelector(".crm-shell");
    if (!shell) {
      return;
    }

    const dark = shell.classList.toggle("dark");
    localStorage.setItem(storageKey, dark ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Переключить цветовую тему"
      title="Переключить цветовую тему"
      className="grid size-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  );
}
