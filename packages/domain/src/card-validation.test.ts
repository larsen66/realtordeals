import assert from "node:assert/strict";
import { test } from "node:test";
import { CardValidationError, parseCreateCardInput, parsePatchCardInput } from "./card.js";

const buyer = { role: "buyer", dealType: "purchase", phone: "+79990009920" };
const current = {
  role: "buyer" as const,
  stage: "selection" as const,
  selectionStatus: "waiting" as const,
  referralStatus: null,
};

test("birthday validation accepts calendar dates and rejects impossible dates before persistence", () => {
  for (const birthday of ["garbage", "2026-02-29", "2026-02-30", "2026-13-01", "19.09.1990"]) {
    assert.throws(() => parseCreateCardInput({ ...buyer, birthday }), CardValidationError);
    assert.throws(() => parsePatchCardInput({ birthday }, current), CardValidationError);
  }
  assert.equal(parseCreateCardInput({ ...buyer, birthday: " 2000-02-29 " }).birthday, "2000-02-29");
  assert.equal(parsePatchCardInput({ birthday: "2000-02-29" }, current).birthday, "2000-02-29");
  assert.equal(parseCreateCardInput({ ...buyer, birthday: "" }).birthday, undefined);
  assert.equal(parseCreateCardInput({ ...buyer, birthday: null }).birthday, undefined);
  assert.equal(parsePatchCardInput({ birthday: null }, current).birthday, null);
});

test("clearing a stage also clears its substatus while omitted stage preserves it", () => {
  for (const previous of [current, {
    role: "buyer" as const, stage: "referral" as const,
    selectionStatus: null, referralStatus: "posted" as const,
  }]) {
    const cleared = parsePatchCardInput({ stage: null }, previous);
    assert.equal(cleared.stage, null);
    assert.equal(cleared.selectionStatus, null);
    assert.equal(cleared.referralStatus, null);
  }
  const unchanged = parsePatchCardInput({ name: "Анна" }, current);
  assert.equal(unchanged.stage, undefined);
  assert.equal(unchanged.selectionStatus, undefined);
  const changedStatus = parsePatchCardInput({ selectionStatus: "awaiting_reply" }, current);
  assert.equal(changedStatus.stage, undefined);
  assert.equal(changedStatus.selectionStatus, "awaiting_reply");
});
