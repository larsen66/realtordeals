import { Search } from "lucide-react";

export function CrmSearch({
  defaultValue,
  tab,
}: {
  defaultValue?: string;
  tab?: string;
}) {
  return (
    <form action="/crm" className="relative mx-auto min-w-0 max-w-xl flex-1">
      {tab && tab !== "all" ? <input type="hidden" name="tab" value={tab} /> : null}
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Поиск по клиенту, объекту, задачам..."
        className="h-10 w-full rounded-full border-0 bg-muted pr-4 pl-10 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
      />
    </form>
  );
}
