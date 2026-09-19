import type {
  BuyerStage,
  CardFields,
  CardRole,
  DealType,
  Payment,
  ReferralStatus,
  SelectionStatus,
  Temperature,
} from "@rieltordeals/domain";

export type CardDto = {
  id: string;
  role: CardRole;
  dealType: DealType;
  phone: string;
  name: string | null;
  objectType: string | null;
  address: string | null;
  source: string | null;
  budget: string | null;
  temperature: Temperature | null;
  payment: Payment[];
  stage: BuyerStage | null;
  selectionStatus: SelectionStatus | null;
  referralStatus: ReferralStatus | null;
  birthday: string | null;
  sourceText: string | null;
  promisedCallAt: string | null;
  fields: CardFields;
  tags: [string, string];
  createdAt: string;
  updatedAt: string;
};

export type CardFilters = {
  role?: CardRole;
  temperature?: Temperature;
  stage?: BuyerStage;
};

export type CardInsert = Omit<CardDto, "id" | "tags" | "createdAt" | "updatedAt">;
export type CardPatch = Partial<CardInsert>;

export type CardStore = {
  list(filters: CardFilters): Promise<CardDto[]>;
  getById(id: string): Promise<CardDto | null>;
  insert(input: CardInsert): Promise<CardDto>;
  update(id: string, patch: CardPatch, expectedUpdatedAt?: string): Promise<CardDto | null>;
};
