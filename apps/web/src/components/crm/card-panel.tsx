"use client";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { Maximize2, Minimize2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const CardPanelContext = createContext<{ close: () => void } | null>(null);

export function CardPanel({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [fullscreen, setFullscreen] = useState(false);
  const [closing, setClosing] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const close = () => setClosing(true);

  useEffect(() => {
    if (!closing) return;
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 120 : 240;
    const timeout = window.setTimeout(() => router.back(), delay);
    return () => window.clearTimeout(timeout);
  }, [closing, router]);

  useEffect(() => {
    function switchClient(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element) || content.current?.contains(event.target)) return;
      if (event.target.closest("button,input,select,textarea,[role=combobox],[role=checkbox]") || window.getSelection()?.toString()) return;
      const target = event.target.closest("a[href]");
      const href = target?.getAttribute("href");
      if (!href) return;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || !/^\/crm\/cards\/[^/]+$/.test(url.pathname)) return;
      // Keep one history entry for the panel so closing returns straight to the list.
      event.preventDefault();
      router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
    }
    document.addEventListener("click", switchClient, true);
    return () => document.removeEventListener("click", switchClient, true);
  }, [router]);

  return <CardPanelContext.Provider value={{ close }}>
    <Dialog.Root open modal={false} onOpenChange={(open) => { if (!open) close(); }}>
      <Dialog.Content
        data-closing={closing || undefined}
        ref={content}
        aria-describedby={undefined}
        onInteractOutside={(event) => event.preventDefault()}
        onOpenAutoFocus={(event) => {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
          event.preventDefault();
          title.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          opener.current?.focus();
        }}
        className={cn("crm-card-panel fixed inset-y-0 right-0 z-50 flex h-dvh w-full flex-col border-l border-border bg-background text-foreground shadow-2xl outline-none", fullscreen ? "max-w-none" : "sm:max-w-[min(860px,calc(100vw-64px))]")}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
          <Dialog.Title ref={title} tabIndex={-1} className="text-sm font-semibold outline-none">Карточка клиента</Dialog.Title>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setFullscreen(!fullscreen)} aria-label={fullscreen ? "Свернуть в боковую панель" : "На весь экран"} title={fullscreen ? "Свернуть в боковую панель" : "На весь экран"} aria-pressed={fullscreen} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
              {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
            <Dialog.Close asChild><button type="button" aria-label="Закрыть карточку" title="Закрыть карточку (Esc)" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><X className="size-5" /></button></Dialog.Close>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </Dialog.Content>
    </Dialog.Root>
  </CardPanelContext.Provider>;
}
