import type {
  BuyerStage,
  CardRole,
  DealType,
  Finish,
  Payment,
  ReferralStatus,
  SelectionStatus,
  Temperature,
  WhoseApartment,
} from "./enums.js";

export const roleLabels: Record<CardRole, string> = {
  seller: "Продавец",
  buyer: "Покупатель",
};

export const dealTypeLabels: Record<DealType, string> = {
  sale: "Продажа",
  purchase: "Покупка",
};

export const temperatureLabels: Record<Temperature, string> = {
  cold: "холодный",
  warm: "тёплый",
  hot: "горячий",
};

export const paymentLabels: Record<Payment, string> = {
  cash: "нал",
  mortgage: "ипотека",
};

export const stageLabels: Record<BuyerStage, string> = {
  selection: "подборка",
  viewing: "показ",
  close: "дожим",
  deal: "сделка",
  referral: "реферал",
};

export const whoseApartmentLabels: Record<WhoseApartment, string> = {
  own: "личная сделка",
  other: "чужой объект",
};

export const finishLabels: Record<Finish, string> = {
  rough: "черновая",
  prefinish: "предчистовая",
  renovated: "ремонт",
};

export const selectionStatusLabels: Record<SelectionStatus, string> = {
  waiting: "ждет",
  awaiting_reply: "жду ответа",
};

export const referralStatusLabels: Record<ReferralStatus, string> = {
  posted: "выложил",
  not_posted: "не выложил",
};

export function labeled<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
) {
  return values.map((value) => ({ value, label: labels[value] }));
}
