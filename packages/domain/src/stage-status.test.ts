import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeStageStatuses } from "./stage-status.js";

test("normalizeStageStatuses keeps extras only on matching stages", () => {
  assert.deepEqual(
    normalizeStageStatuses({ stage: "selection" }),
    { selectionStatus: "waiting", referralStatus: null },
  );
  assert.deepEqual(
    normalizeStageStatuses({
      stage: "selection",
      selectionStatus: "awaiting_reply",
    }),
    { selectionStatus: "awaiting_reply", referralStatus: null },
  );
  assert.deepEqual(
    normalizeStageStatuses({ stage: "referral" }),
    { selectionStatus: null, referralStatus: "not_posted" },
  );
  assert.deepEqual(
    normalizeStageStatuses({
      stage: "viewing",
      selectionStatus: "waiting",
      referralStatus: "posted",
    }),
    { selectionStatus: null, referralStatus: null },
  );
  assert.deepEqual(
    normalizeStageStatuses({ stage: null }),
    { selectionStatus: null, referralStatus: null },
  );
});
