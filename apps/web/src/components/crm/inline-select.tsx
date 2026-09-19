"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { pillTones, type PillTone } from "./status-tones";

export function InlineSelect({
  value,
  onChange,
  options,
  emptyLabel = "—",
  disabled,
  tone = "gray",
  className,
  label,
}: {
  value: string;
  onChange: (value: string) => void | Promise<void>;
  options: { value: string; label: string }[];
  emptyLabel?: string;
  disabled?: boolean;
  tone?: PillTone;
  className?: string;
  label?: string;
}) {
  const [error, setError] = useState("");
  return (
    <span className="inline-flex flex-col items-start gap-1">
    <span
      className={cn(
        "relative inline-flex h-8 items-center rounded-md",
        pillTones[tone],
        disabled && "opacity-60",
        className,
      )}
    >
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={async (event) => {
          setError("");
          try { await onChange(event.target.value); }
          catch (err) { setError(err instanceof Error ? err.message : "Не удалось сохранить"); }
        }}
        className="h-full cursor-pointer appearance-none rounded-md bg-transparent py-0 pr-7 pl-2.5 text-xs font-medium outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-wait [&>option]:bg-card [&>option]:text-foreground"
      >
        <option value="">{emptyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 size-3.5" />
    </span>
    {error && <span role="alert" className="max-w-48 whitespace-normal text-xs text-destructive">{error}</span>}
    </span>
  );
}
