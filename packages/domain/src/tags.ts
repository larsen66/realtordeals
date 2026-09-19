import type { CardRole, DealType } from "./enums.js";
import { dealTypeLabels, roleLabels } from "./labels.js";

export function tagsFor(role: CardRole, dealType: DealType): [string, string] {
  return [roleLabels[role], dealTypeLabels[dealType]];
}
