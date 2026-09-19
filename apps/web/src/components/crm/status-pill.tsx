import { cn } from "@/lib/utils";
import { pillTones, type PillTone } from "./status-tones";

export function StatusPill({
  children,
  tone = "gray",
}: {
  children: string;
  tone?: PillTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-md px-2.5 py-1 text-xs font-medium leading-5",
        pillTones[tone],
      )}
    >
      {children}
    </span>
  );
}
