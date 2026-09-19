import type { BuyerStage, ReferralStatus, SelectionStatus } from "./enums.js";

export function normalizeStageStatuses(input: {
  stage: BuyerStage | null;
  selectionStatus?: SelectionStatus | null;
  referralStatus?: ReferralStatus | null;
}): {
  selectionStatus: SelectionStatus | null;
  referralStatus: ReferralStatus | null;
} {
  if (input.stage === "selection") {
    return {
      selectionStatus: input.selectionStatus ?? "waiting",
      referralStatus: null,
    };
  }
  if (input.stage === "referral") {
    return {
      selectionStatus: null,
      referralStatus: input.referralStatus ?? "not_posted",
    };
  }
  return {
    selectionStatus: null,
    referralStatus: null,
  };
}
