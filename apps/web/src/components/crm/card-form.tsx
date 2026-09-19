"use client";

import {
  finishLabels,
  referralStatusLabels,
  roleLabels,
  selectionStatusLabels,
  stageLabels,
  temperatureLabels,
  whoseApartmentLabels,
  type BuyerStage,
  type CardRole,
  type DealType,
  type Finish,
  type Payment,
  type ReferralStatus,
  type SelectionStatus,
  type Temperature,
  type WhoseApartment,
} from "@rieltordeals/domain";
import { useRouter } from "next/navigation";
import { useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createCard, toDateTimeLocal, updateCard, type Card } from "@/lib/cards";
import { formatBudget } from "@/lib/budget";
import { PaymentOptions } from "./payment-options";
import { Field } from "./field";
import { CardPanelContext } from "./card-panel";

type Props = {
  card?: Card;
  initialRole?: CardRole;
};

const emptyFields: Record<string, string | boolean | undefined> = {};

function fromCard(card?: Card, initialRole: CardRole = "buyer") {
  return {
    role: (card?.role ?? initialRole) as CardRole,
    dealType: (card?.dealType ?? (initialRole === "seller" ? "sale" : "purchase")) as DealType,
    phone: card?.phone ?? "+7",
    name: card?.name ?? "",
    objectType: card?.objectType ?? "",
    address: card?.address ?? "",
    source: card?.source ?? "",
    budget: formatBudget(card?.budget ?? ""),
    temperature: (card?.temperature ?? "") as Temperature | "",
    payment: card?.payment ?? [] as Payment[],
    stage: (card?.stage ?? (initialRole === "buyer" ? "selection" : "")) as BuyerStage | "",
    selectionStatus: (card?.selectionStatus ?? "") as SelectionStatus | "",
    referralStatus: (card?.referralStatus ?? "") as ReferralStatus | "",
    birthday: card?.birthday?.slice(0, 10) ?? "",
    sourceText: card?.sourceText ?? "",
    promisedCallAt: toDateTimeLocal(card?.promisedCallAt ?? null),
    fields: { ...(card?.fields ?? emptyFields) },
  };
}

export function CardForm({ card, initialRole }: Props) {
  const router = useRouter();
  const panel = useContext(CardPanelContext);
  const [original, setOriginal] = useState(() => fromCard(card, initialRole));
  const [state, setState] = useState(original);
  const [syncedVersion, setSyncedVersion] = useState(card?.updatedAt);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Refresh unchanged inputs after task actions without discarding the manager's edits.
  if (card && card.updatedAt !== syncedVersion) {
    const fresh = fromCard(card, initialRole);
    const merged = { ...state, fields: { ...state.fields } };
    for (const key of Object.keys(fresh) as (keyof typeof fresh)[]) {
      if (key !== "fields" && state[key] === original[key]) Object.assign(merged, { [key]: fresh[key] });
    }
    for (const key of new Set([...Object.keys(fresh.fields), ...Object.keys(state.fields)])) {
      if (JSON.stringify(state.fields[key]) === JSON.stringify(original.fields[key])) merged.fields[key] = fresh.fields[key];
    }
    setSyncedVersion(card.updatedAt);
    setOriginal(fresh);
    setState(merged);
  }

  function setField(key: string, value: string | boolean | null | undefined) {
    setState((current) => ({
      ...current,
      fields: { ...current.fields, [key]: value },
    }));
  }

  function fieldText(key: string) {
    const value = state.fields[key];
    return typeof value === "string" ? value : "";
  }

  function fieldBool(key: string) {
    return state.fields[key] === true;
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (state.phone.trim() === "+7") {
      setError("Введите номер телефона полностью");
      return;
    }
    setPending(true);
    setError(null);

    const payload = {
      role: state.role,
      dealType: state.dealType,
      phone: state.phone,
      name: state.name || null,
      objectType: state.objectType || null,
      address: state.address || null,
      source: state.source || null,
      budget: state.budget || null,
      temperature: state.temperature || null,
      payment: state.payment,
      stage: state.role === "buyer" ? state.stage || undefined : null,
      selectionStatus:
        state.role === "buyer" && state.stage === "selection"
          ? state.selectionStatus || "waiting"
          : null,
      referralStatus:
        state.role === "buyer" && state.stage === "referral"
          ? state.referralStatus || "not_posted"
          : null,
      birthday: state.birthday || null,
      sourceText: state.sourceText || null,
      promisedCallAt: state.promisedCallAt
        ? new Date(state.promisedCallAt).toISOString()
        : null,
      fields: state.fields,
    };

    try {
      const changes: Record<string, unknown> = {};
      for (const key of Object.keys(payload) as (keyof typeof payload)[]) {
        if (key !== "fields" && state[key] !== original[key]) changes[key] = payload[key];
      }
      const fieldChanges = Object.fromEntries(Object.entries(state.fields).filter(([key, value]) =>
        key !== "tasks" && JSON.stringify(value) !== JSON.stringify(original.fields[key])));
      if (Object.keys(fieldChanges).length) changes.fields = fieldChanges;
      const result = card
        ? await updateCard(card.id, changes)
        : await createCard(payload);
      const saved = fromCard(result.card, initialRole);
      setOriginal(saved);
      setState(saved);
      if (!panel) router.push(`/crm/cards/${result.card.id}`);
      else if (!card) router.replace(`/crm/cards/${result.card.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "не удалось сохранить");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8">
      <section className="grid gap-4 md:grid-cols-2">
        <Field label="Роль">
          <Select
            disabled={Boolean(card) || Boolean(initialRole)}
            value={state.role}
            onValueChange={(value) =>
              setState((current) => ({
                ...current,
                role: value as CardRole,
                dealType: value === "seller" ? "sale" : "purchase",
                stage: value === "buyer" ? current.stage || "selection" : "",
                selectionStatus:
                  value === "buyer"
                    ? current.selectionStatus || "waiting"
                    : "",
                referralStatus: "",
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buyer">{roleLabels.buyer}</SelectItem>
              <SelectItem value="seller">{roleLabels.seller}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Тип сделки">
          <Select
            value={state.dealType}
            onValueChange={(value) =>
              setState((current) => ({ ...current, dealType: value as DealType }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">Продажа</SelectItem>
              <SelectItem value="purchase">Покупка</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Телефон">
          <Input
            required
            value={state.phone}
            onChange={(event) =>
              setState((current) => ({ ...current, phone: event.target.value }))
            }
          />
        </Field>
        <Field label="Имя">
          <Input
            value={state.name}
            onChange={(event) =>
              setState((current) => ({ ...current, name: event.target.value }))
            }
          />
        </Field>
        <Field label="Тип объекта">
          <Input
            value={state.objectType}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                objectType: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Температура">
          <Select
            value={state.temperature || "none"}
            onValueChange={(value) =>
              setState((current) => ({
                ...current,
                temperature: value === "none" ? "" : (value as Temperature),
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="не задана" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">не задана</SelectItem>
              {Object.entries(temperatureLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="ДР">
          <Input
            type="date"
            value={state.birthday}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                birthday: event.target.value,
              }))
            }
          />
        </Field>
        <Field label="Перезвонить до">
          <Input
            type="datetime-local"
            value={state.promisedCallAt}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                promisedCallAt: event.target.value,
              }))
            }
          />
        </Field>
      </section>

      {state.role === "buyer" ? (
        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Источник">
            <Input
              value={state.source}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  source: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Бюджет">
            <Input
              inputMode="decimal"
              value={state.budget}
              onChange={(event) => {
                const input = event.currentTarget;
                const raw = input.value;
                const budget = formatBudget(raw);
                const beforeCursor = raw.slice(0, input.selectionStart ?? raw.length).replace(/\s/g, "").length;
                setState((current) => ({ ...current, budget }));
                if (budget !== raw) {
                  let cursor = 0;
                  let characters = 0;
                  while (cursor < budget.length && characters < beforeCursor) {
                    if (!/\s/.test(budget[cursor])) characters++;
                    cursor++;
                  }
                  requestAnimationFrame(() => input.setSelectionRange(cursor, cursor));
                }
              }}
            />
          </Field>
          <Field label="Оплата">
            <PaymentOptions
              value={state.payment}
              onChange={(payment) => setState((current) => ({ ...current, payment }))}
            />
          </Field>
          <Field label="Этап">
            <Select
              value={state.stage || "selection"}
              onValueChange={(value) =>
                setState((current) => ({
                  ...current,
                  stage: value as BuyerStage,
                  selectionStatus:
                    value === "selection"
                      ? current.selectionStatus || "waiting"
                      : "",
                  referralStatus:
                    value === "referral"
                      ? current.referralStatus || "not_posted"
                      : "",
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(stageLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {state.stage === "selection" ? (
            <Field label="Статус подборки">
              <Select
                value={state.selectionStatus || "waiting"}
                onValueChange={(value) =>
                  setState((current) => ({
                    ...current,
                    selectionStatus: value as SelectionStatus,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(selectionStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          {state.stage === "referral" ? (
            <Field label="Статус реферала">
              <Select
                value={state.referralStatus || "not_posted"}
                onValueChange={(value) =>
                  setState((current) => ({
                    ...current,
                    referralStatus: value as ReferralStatus,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(referralStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <Field label="Что покупает">
            <Input
              value={fieldText("purchaseWhat")}
              onChange={(event) => setField("purchaseWhat", event.target.value)}
            />
          </Field>
          <Field label="Способ покупки">
            <Input
              value={fieldText("purchaseMethod")}
              onChange={(event) => setField("purchaseMethod", event.target.value)}
            />
          </Field>
          <Field label="Локация">
            <Input
              value={fieldText("location")}
              onChange={(event) => setField("location", event.target.value)}
            />
          </Field>
          <Field label="Почему локация">
            <Input
              value={fieldText("locationWhy")}
              onChange={(event) => setField("locationWhy", event.target.value)}
            />
          </Field>
          <Field label="Метраж">
            <Input
              value={fieldText("area")}
              onChange={(event) => setField("area", event.target.value)}
            />
          </Field>
          <Field label="Планировка">
            <Input
              value={fieldText("layout")}
              onChange={(event) => setField("layout", event.target.value)}
            />
          </Field>
          <Field label="Отделка">
            <Select
              value={fieldText("finish") || "none"}
              onValueChange={(value) =>
                setField("finish", value === "none" ? null : (value as Finish))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="не задана" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">не задана</SelectItem>
                {Object.entries(finishLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Цель покупки">
            <Input
              value={fieldText("purchaseGoal")}
              onChange={(event) => setField("purchaseGoal", event.target.value)}
            />
          </Field>
          <Field label="Где смотрели">
            <Input
              value={fieldText("whereViewed")}
              onChange={(event) => setField("whereViewed", event.target.value)}
            />
          </Field>
          <Field label="Застройщики">
            <Input
              value={fieldText("developersViewed")}
              onChange={(event) =>
                setField("developersViewed", event.target.value)
              }
            />
          </Field>
          <label className="flex items-center gap-2 self-end pb-1 text-sm">
            <Checkbox
              checked={fieldBool("viewedBefore")}
              onCheckedChange={(value) => setField("viewedBefore", value === true)}
            />
            Уже смотрели квартиры
          </label>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Адрес">
            <Input
              value={state.address}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Цена">
            <Input
              value={fieldText("price")}
              onChange={(event) => setField("price", event.target.value)}
            />
          </Field>
          <Field label="Комнатность">
            <Input
              value={fieldText("rooms")}
              onChange={(event) => setField("rooms", event.target.value)}
            />
          </Field>
          <Field label="Площадь">
            <Input
              value={fieldText("area")}
              onChange={(event) => setField("area", event.target.value)}
            />
          </Field>
          <Field label="Этаж">
            <Input
              value={fieldText("floor")}
              onChange={(event) => setField("floor", event.target.value)}
            />
          </Field>
          <Field label="Этажность">
            <Input
              value={fieldText("floors")}
              onChange={(event) => setField("floors", event.target.value)}
            />
          </Field>
          <Field label="Чья квартира">
            <Select
              value={fieldText("whoseApartment") || "none"}
              onValueChange={(value) =>
                setField(
                  "whoseApartment",
                  value === "none" ? null : (value as WhoseApartment),
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="не задано" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">не задано</SelectItem>
                {Object.entries(whoseApartmentLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ссылка на объявление">
            <Input
              value={fieldText("listingUrl")}
              onChange={(event) => setField("listingUrl", event.target.value)}
            />
          </Field>
          <Field label="Собственников">
            <Input
              value={fieldText("ownersCount")}
              onChange={(event) => setField("ownersCount", event.target.value)}
            />
          </Field>
          <Field label="Цель продажи">
            <Input
              value={fieldText("saleGoal")}
              onChange={(event) => setField("saleGoal", event.target.value)}
            />
          </Field>
          <Field label="Скорость продажи">
            <Input
              value={fieldText("saleSpeed")}
              onChange={(event) => setField("saleSpeed", event.target.value)}
            />
          </Field>
          <Field label="Что оставляют">
            <Input
              value={fieldText("whatTheyLeave")}
              onChange={(event) => setField("whatTheyLeave", event.target.value)}
            />
          </Field>
          <div className="grid gap-3 md:col-span-2">
            <BooleanField
              label="Ипотека"
              checked={fieldBool("mortgage")}
              onChange={(value) => setField("mortgage", value)}
            />
            <BooleanField
              label="Аресты"
              checked={fieldBool("arrests")}
              onChange={(value) => setField("arrests", value)}
            />
            <BooleanField
              label="Детские доли"
              checked={fieldBool("childrenShares")}
              onChange={(value) => setField("childrenShares", value)}
            />
            <BooleanField
              label="Маткапитал"
              checked={fieldBool("maternityCapital")}
              onChange={(value) => setField("maternityCapital", value)}
            />
            <BooleanField
              label="Занижение"
              checked={fieldBool("priceUnderstatement")}
              onChange={(value) => setField("priceUnderstatement", value)}
            />
          </div>
        </section>
      )}

      <Field label="Комментарий о клиенте">
        <Textarea
          rows={5}
          value={state.sourceText}
          onChange={(event) =>
            setState((current) => ({
              ...current,
              sourceText: event.target.value,
            }))
          }
        />
      </Field>

      {state.role === "buyer" && <section id="selection" className="scroll-mt-6 space-y-4 rounded-xl border bg-muted/40 p-4">
        <div><h2 className="font-semibold">Подборка покупателя</h2><p className="mt-1 text-sm text-muted-foreground">Текущие варианты для запроса выше. Дополняйте их по мере работы с покупателем.</p></div>
        <Field label="Информация о подборке"><Textarea value={fieldText("selectionNotes")} onChange={(event) => setField("selectionNotes", event.target.value)} placeholder="Что подобрали, что понравилось, какие варианты нужно заменить" /></Field>
        <Field label="Ссылки на варианты"><Textarea value={fieldText("selectionLinks")} onChange={(event) => setField("selectionLinks", event.target.value)} placeholder="По одной ссылке на строку" /></Field>
      </section>}

      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}

      {!card && <label className="flex items-start gap-2 text-sm"><input type="checkbox" required className="mt-1" />Проверил данные и подтверждаю создание карточки в CRM</label>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняю…" : card ? "Сохранить" : "Создать карточку"}
        </Button>
        <Button type="button" variant="outline" onClick={() => panel ? panel.close() : router.push(state.role === "buyer" ? "/crm/buyers" : "/crm/sellers")}>
          {panel ? "Закрыть" : "К списку"}
        </Button>
      </div>
    </form>
  );
}

function BooleanField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  );
}
