"use client";

import {
  referralStatusLabels,
  stageLabels,
  temperatureLabels,
  type BuyerStage,
  type ReferralStatus,
  type SelectionStatus,
  type Temperature,
} from "@rieltordeals/domain";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateCard, type Card } from "@/lib/cards";
import { PaymentOptions } from "./payment-options";
import { InlineSelect } from "./inline-select";
import {
  referralStatusTone,
  selectionStatusTone,
  stageTone,
  temperatureTone,
} from "./status-tones";

export type StatusCard = Pick<
  Card,
  | "id"
  | "role"
  | "temperature"
  | "payment"
  | "stage"
  | "selectionStatus"
  | "referralStatus"
>;

const temperatureOptions = Object.entries(temperatureLabels).map(
  ([value, label]) => ({ value, label }),
);
const stageOptions = Object.entries(stageLabels).map(([value, label]) => ({
  value,
  label,
}));
const selectionOptions = [
  { value: "waiting", label: "ждет" },
  { value: "awaiting_reply", label: "жду ответа" },
];
const referralOptions = Object.entries(referralStatusLabels).map(
  ([value, label]) => ({ value, label }),
);

function Dash() {
  return <span className="text-[13px] text-muted-foreground">—</span>;
}

function useCardPatch(id: string) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    try {
      await updateCard(id, body);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return { pending, patch };
}

export function TemperatureControl({ card }: { card: StatusCard }) {
  const { pending, patch } = useCardPatch(card.id);
  return (
    <InlineSelect
      label="Температура клиента"
      value={card.temperature ?? ""}
      disabled={pending}
      tone={temperatureTone(card.temperature)}
      options={temperatureOptions}
      onChange={(value) =>
        patch({ temperature: (value || null) as Temperature | null })
      }
    />
  );
}

export function PaymentControl({ card }: { card: StatusCard }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(card.payment);
  const [synced, setSynced] = useState(card.payment);
  if (card.payment !== synced) {
    setSynced(card.payment);
    setSelected(card.payment);
  }
  if (card.role !== "buyer") return <Dash />;
  return (
    <div className="space-y-1">
      <PaymentOptions
        value={selected}
        disabled={pending}
        onChange={async (payment) => {
          setPending(true);
          setError("");
          try {
            const result = await updateCard(card.id, { payment });
            setSelected(result.card.payment);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Не удалось сохранить");
          } finally {
            setPending(false);
          }
        }}
      />
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function StageControl({ card }: { card: StatusCard }) {
  const { pending, patch } = useCardPatch(card.id);
  if (card.role !== "buyer") {
    return <Dash />;
  }
  return (
    <InlineSelect
      label="Этап клиента"
      value={card.stage ?? ""}
      disabled={pending}
      emptyLabel="этап"
      tone={stageTone(card.stage)}
      options={stageOptions}
      onChange={(value) => patch({ stage: (value || "selection") as BuyerStage })}
    />
  );
}

export function StageStatusControl({ card }: { card: StatusCard }) {
  const { pending, patch } = useCardPatch(card.id);
  if (card.role !== "buyer") {
    return <Dash />;
  }
  if (card.stage === "selection") {
    return (
      <InlineSelect
        label="Статус подборки клиента"
        value={card.selectionStatus ?? "waiting"}
        disabled={pending}
        tone={selectionStatusTone(card.selectionStatus)}
        options={selectionOptions}
        emptyLabel=""
        onChange={(value) =>
          patch({ selectionStatus: (value || "waiting") as SelectionStatus })
        }
      />
    );
  }
  if (card.stage === "referral") {
    return (
      <InlineSelect
        label="Статус реферала клиента"
        value={card.referralStatus ?? "not_posted"}
        disabled={pending}
        tone={referralStatusTone(card.referralStatus)}
        options={referralOptions}
        emptyLabel=""
        onChange={(value) =>
          patch({ referralStatus: (value || "not_posted") as ReferralStatus })
        }
      />
    );
  }
  return <Dash />;
}
