import {
  stageLabels,
  temperatureLabels,
  type BuyerStage,
  type Temperature,
} from "@rieltordeals/domain";
import type { ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { queryString, type CardFilters } from "@/lib/cards";
import { cn } from "@/lib/utils";

function href(filters: CardFilters) {
  return `/crm${queryString(filters)}`;
}

function Chip({
  active,
  children,
  filters,
}: {
  active: boolean;
  children: ReactNode;
  filters: CardFilters;
}) {
  return (
    <Link
      href={href(filters)}
      className={cn(
        buttonVariants({ variant: active ? "default" : "outline", size: "sm" }),
      )}
    >
      {children}
    </Link>
  );
}

export function CrmFilters({ filters }: { filters: CardFilters }) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Chip filters={{}} active={!filters.role}>
          Все
        </Chip>
        <Chip
          filters={{ ...filters, role: "buyer" }}
          active={filters.role === "buyer"}
        >
          Покупатели
        </Chip>
        <Chip
          filters={{ ...filters, role: "seller" }}
          active={filters.role === "seller"}
        >
          Продавцы
        </Chip>
      </div>
      {filters.role !== "seller" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <Chip
              filters={{ role: filters.role, stage: filters.stage }}
              active={!filters.temperature}
            >
              любая температура
            </Chip>
            {(Object.keys(temperatureLabels) as Temperature[]).map((value) => (
              <Chip
                key={value}
                filters={{ ...filters, temperature: value }}
                active={filters.temperature === value}
              >
                {temperatureLabels[value]}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip
              filters={{ role: filters.role, temperature: filters.temperature }}
              active={!filters.stage}
            >
              любой этап
            </Chip>
            {(Object.keys(stageLabels) as BuyerStage[]).map((value) => (
              <Chip
                key={value}
                filters={{ ...filters, stage: value }}
                active={filters.stage === value}
              >
                {stageLabels[value]}
              </Chip>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
