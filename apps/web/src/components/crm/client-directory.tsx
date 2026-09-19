import Link from "next/link";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import { paymentLabels, stageLabels } from "@rieltordeals/domain";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { fieldString, firstParam, formatDay, listCards, matchesQuery, type Card } from "@/lib/cards";
import { isBirthdaySoon } from "@/lib/birthday";
import { cn } from "@/lib/utils";
import { PaymentControl, StageControl, StageStatusControl, TemperatureControl } from "./card-status-controls";
import { BuyerTasksSummary } from "./buyer-tasks-summary";
import { DirectoryFilterForm } from "./directory-filter-form";


export type DirectoryMode = "buyers" | "sellers" | "selections" | "viewings" | "deals";
export type DirectoryParams = Record<string, string | string[] | undefined>;

const pages = {
  buyers: { title: "Покупатели", description: "Запрос, квалификация и текущий этап каждого покупателя.", empty: "Покупателей пока нет." },
  sellers: { title: "Продавцы", description: "Контакты собственников и информация об их объектах.", empty: "Продавцов пока нет." },
  selections: { title: "Подборки", description: "Кому подбираем квартиру, что ищем и от кого ждём ответ.", empty: "Пока нет покупателей на этапе подборки." },
  viewings: { title: "Показы", description: "Покупатели на этапе показа и их запросы.", empty: "Пока нет покупателей на этапе показа." },
  deals: { title: "Сделки", description: "Покупатели, перешедшие к сделке. Все подробности в карточке клиента.", empty: "Пока нет покупателей на этапе сделки." },
};

const stageByMode = { selections: "selection", viewings: "viewing", deals: "deal" } as const;
const temperatures = [
  { value: "", label: "Все", dot: "bg-[#a3abb7]" },
  { value: "hot", label: "Горячие", dot: "bg-[#e87b62]" },
  { value: "warm", label: "Тёплые", dot: "bg-[#dfb553]" },
  { value: "cold", label: "Холодные", dot: "bg-[#7ca5d5]" },
];

function Filter({ name, label, value, options }: {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-[11px] font-medium text-muted-foreground">
      {label}
      <select name={name} defaultValue={value} className="h-9 w-full min-w-0 rounded-lg border border-border bg-card px-2.5 text-[12px] font-normal text-foreground/80 outline-none focus:border-ring">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function optionsFromCards(cards: Card[], key: "source" | "objectType") {
  return [
    { value: "", label: "Все" },
    ...Array.from(new Set(cards.map((card) => card[key]).filter((value): value is string => Boolean(value))))
      .sort((a, b) => a.localeCompare(b, "ru"))
      .map((value) => ({ value, label: value })),
  ];
}

function requestSummary(card: Card) {
  return [
    fieldString(card, "purchaseWhat") ?? card.objectType,
    fieldString(card, "layout"),
    fieldString(card, "area") ? `${fieldString(card, "area")} м²` : null,
  ].filter(Boolean).join(" · ") || "Запрос не заполнен";
}

export async function ClientDirectory({ mode, params }: { mode: DirectoryMode; params: DirectoryParams }) {
  const page = pages[mode];
  const path = `/crm/${mode}`;
  const seller = mode === "sellers";
  const pipeline = mode === "selections" || mode === "viewings" || mode === "deals";
  const fixedStage = pipeline ? stageByMode[mode] : undefined;
  const param = (key: string) => firstParam(params[key]) ?? "";
  const query = param("q").trim();
  const temperature = param("temperature");
  const payment = param("payment");
  const stage = param("stage");
  const source = param("source");
  const objectType = param("objectType");
  const selectionStatus = param("selectionStatus");
  const sort = param("sort") || "newest";
  let cards: Card[];
  try {
    cards = (await listCards({ role: seller ? "seller" : "buyer", stage: fixedStage })).cards;
  } catch {
    return (
      <main className="p-5 sm:p-8">
        <h1 className="text-2xl font-semibold text-foreground">{page.title}</h1>
        <div role="alert" className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          Не удалось загрузить карточки. Проверьте подключение и повторите попытку.
          <Link href={path} className="mt-3 block w-fit font-medium underline">Повторить загрузку</Link>
        </div>
      </main>
    );
  }

  const matching = cards.filter((card) => {
    const fullQuery = [fieldString(card, "purchaseWhat"), fieldString(card, "location"), fieldString(card, "layout")].filter(Boolean).join(" ").toLocaleLowerCase("ru");
    return (!query || matchesQuery(card, query) || fullQuery.includes(query.toLocaleLowerCase("ru"))) &&
      (!payment || card.payment.some((value) => value === payment)) &&
      (!stage || fixedStage || card.stage === stage) &&
      (!source || card.source === source) &&
      (!objectType || card.objectType === objectType) &&
      (!selectionStatus || (card.selectionStatus ?? "waiting") === selectionStatus);
  });
  const filtered = matching.filter((card) => !temperature || card.temperature === temperature).sort((a, b) => {
    const order = sort === "name"
      ? (a.name ?? a.phone).localeCompare(b.name ?? b.phone, "ru")
      : sort === "updated"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : b.createdAt.localeCompare(a.createdAt);
    return order || a.id.localeCompare(b.id);
  });
  const filteredActive = Boolean(query || temperature || payment || (!fixedStage && stage) || source || objectType || selectionStatus || sort !== "newest");
  const heads = seller
    ? ["Продавец / телефон", "Тип", "Адрес", "Цена", "Температура", "ДР"]
    : pipeline
      ? ["Покупатель / телефон", "Бюджет", "Запрос", "Локация", "Температура", mode === "selections" ? "Статус подборки" : "Оплата"]
      : ["Покупатель / телефон", "Задачи", "Температура", "Этап", "Статус этапа", "Источник", "Бюджет", "Тип объекта", "Оплата", "ДР"];
  const cellClass = "px-4 py-4 text-[12px] text-foreground/70";

  return (
    <main className="min-w-0 space-y-6 p-4 sm:p-7 lg:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[25px] font-semibold tracking-tight text-foreground">{page.title}</h1>
            <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[12px] text-muted-foreground">{cards.length}</span>
          </div>
          <p className="mt-2 max-w-xl text-[13px] leading-5 text-muted-foreground">{page.description}</p>
        </div>
        <Link href={`/crm/cards/new?role=${seller ? "seller" : "buyer"}`} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-medium text-primary-foreground hover:bg-primary/90">
          <Plus className="size-4" aria-hidden="true" />
          Добавить {seller ? "продавца" : "покупателя"}
        </Link>
      </header>

      <DirectoryFilterForm key={JSON.stringify(params)} path={path}>
        {temperature && <input type="hidden" name="temperature" value={temperature} />}
        <nav aria-label="Температура клиентов" className="flex flex-wrap gap-2">
          {temperatures.map((item) => (
            <button key={item.value} type="submit" name="temperature" value={item.value} aria-pressed={temperature === item.value} className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[12px] transition-colors", temperature === item.value ? "border-border bg-card font-medium text-foreground shadow-sm" : "border-transparent text-muted-foreground hover:bg-card")}>
              <span className={cn("size-1.5 rounded-full", item.dot)} aria-hidden="true" />
              {item.label}
              <span className="ml-1 text-[11px] text-muted-foreground">{matching.filter((card) => !item.value || card.temperature === item.value).length}</span>
            </button>
          ))}
        </nav>
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="relative min-w-[180px] flex-1">
              <span className="sr-only">Поиск клиентов</span>
              <Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" aria-hidden="true" />
              <input name="q" type="search" defaultValue={query} placeholder="Имя, телефон, адрес или запрос" className="h-9 w-full rounded-lg border border-border bg-muted/30 pr-3 pl-9 text-[12px] outline-none placeholder:text-muted-foreground focus:border-ring" />
            </label>
            <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-lg bg-muted px-4 text-[12px] font-medium text-foreground/80 hover:bg-accent"><SlidersHorizontal className="size-3.5" aria-hidden="true" />Применить</button>
            {filteredActive && <Link href={path} className="text-[12px] text-muted-foreground hover:underline">Сбросить</Link>}
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            <Filter name="objectType" label="Тип объекта" value={objectType} options={optionsFromCards(cards, "objectType")} />
            {!seller && <Filter name="payment" label="Оплата" value={payment} options={[{ value: "", label: "Любая" }, ...Object.entries(paymentLabels).map(([value, label]) => ({ value, label }))]} />}
            {!seller && !pipeline && <Filter name="stage" label="Этап" value={stage} options={[{ value: "", label: "Все этапы" }, ...Object.entries(stageLabels).map(([value, label]) => ({ value, label }))]} />}
            {!seller && <Filter name="source" label="Источник" value={source} options={optionsFromCards(cards, "source")} />}
            {mode === "selections" && <Filter name="selectionStatus" label="Статус подборки" value={selectionStatus} options={[{ value: "", label: "Все статусы" }, { value: "waiting", label: "Ожидает подборку" }, { value: "awaiting_reply", label: "Ждём ответ" }]} />}
            <Filter name="sort" label="Сортировка" value={sort} options={[{ value: "newest", label: "Сначала новые" }, { value: "updated", label: "Недавно обновлённые" }, { value: "name", label: "По имени: А-Я" }]} />
          </div>
        </div>
      </DirectoryFilterForm>

      <section aria-label={page.title} className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(16_24_40_/_4%)]">
        <div className="flex items-center justify-between px-4 py-4">
          <h2 className="text-[13px] font-semibold text-foreground">{mode === "selections" ? "Кому нужна подборка" : "Клиенты"}</h2>
          <span className="text-[11px] text-muted-foreground">Показано {filtered.length} из {cards.length}</span>
        </div>
        <Table>
          <TableHeader><TableRow className="border-border bg-muted/30 hover:bg-muted/30">{heads.map((head) => <TableHead key={head} className="px-4 text-[11px] font-medium text-muted-foreground">{head}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={heads.length} className="px-4 py-14 text-center text-[13px] text-muted-foreground">
                {cards.length === 0 ? page.empty : "По этим условиям никто не найден."}
                {filteredActive && <Link href={path} className="mt-3 block text-foreground/80 underline">Сбросить фильтры</Link>}
              </TableCell></TableRow>
            ) : filtered.map((card) => (
              <TableRow key={card.id} className="border-border/70">
                <TableCell className={cellClass}>
                  <Link href={`/crm/cards/${card.id}`} className="font-semibold text-foreground hover:underline">{card.name ?? "Без имени"}</Link>
                  <a href={`tel:${card.phone}`} className="mt-1 block text-[11px] text-muted-foreground hover:underline">{card.phone}</a>
                </TableCell>
                {seller ? <>
                  <TableCell className={cellClass}>{card.objectType ?? "-"}</TableCell>
                  <TableCell className={`${cellClass} min-w-[160px] max-w-[260px] whitespace-normal`}>{card.address ?? "-"}</TableCell>
                  <TableCell className={cellClass}>{fieldString(card, "price") ?? "-"}</TableCell>
                  <TableCell className={cellClass}><TemperatureControl card={card} /></TableCell>
                  <TableCell className={cellClass}>{isBirthdaySoon(card.birthday) ? formatDay(card.birthday) : null}</TableCell>
                </> : pipeline ? <>
                  <TableCell className={cellClass}>{card.budget ?? "-"}</TableCell>
                  <TableCell className={`${cellClass} min-w-[180px] max-w-[260px] whitespace-normal leading-5`}>{requestSummary(card)}</TableCell>
                  <TableCell className={`${cellClass} min-w-[130px] max-w-[220px] whitespace-normal`}>{fieldString(card, "location") ?? fieldString(card, "district") ?? "-"}</TableCell>
                  <TableCell className={cellClass}><TemperatureControl card={card} /></TableCell>
                  <TableCell className={cellClass}>{mode === "selections" ? <StageStatusControl card={card} /> : <PaymentControl card={card} />}</TableCell>
                </> : <>
                  <TableCell className={`${cellClass} whitespace-normal`}><BuyerTasksSummary card={card} /></TableCell>
                  <TableCell className={cellClass}><TemperatureControl card={card} /></TableCell>
                  <TableCell className={cellClass}><StageControl card={card} /></TableCell>
                  <TableCell className={cellClass}><StageStatusControl card={card} /></TableCell>
                  <TableCell className={cellClass}>{card.source ?? "-"}</TableCell>
                  <TableCell className={cellClass}>{card.budget ?? "-"}</TableCell>
                  <TableCell className={cellClass}>{card.objectType ?? "-"}</TableCell>
                  <TableCell className={cellClass}><PaymentControl card={card} /></TableCell>
                  <TableCell className={cellClass}>{isBirthdaySoon(card.birthday) ? formatDay(card.birthday) : null}</TableCell>
                </>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="border-t border-border/70 px-4 py-3 text-[11px] text-muted-foreground">Нажмите на имя клиента, чтобы открыть полную карточку.</p>
      </section>
    </main>
  );
}
