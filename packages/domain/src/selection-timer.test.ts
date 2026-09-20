import assert from "node:assert/strict";
import test from "node:test";
import { buyerFieldsSchema } from "./fields.js";
import { getSelectionTimerState, selectionTimerSchema } from "./selection-timer.js";

const endsAt = "2026-09-22T12:00:00.000Z";
const deadlineMs = Date.parse(endsAt);
const hourMs = 3_600_000;

for (const durationHours of [24, 48] as const) {
  test(`${durationHours}-hour timer changes phase at each exact quarter boundary`, () => {
    const timer = { durationHours, endsAt };
    const quarterMs = durationHours * hourMs / 4;
    assert.deepEqual(getSelectionTimerState(timer, deadlineMs - durationHours * hourMs), {
      text: `${durationHours}:00`, phase: 0, expired: false,
    });
    for (const [quartersRemaining, previousPhase, nextPhase] of [
      [3, 0, 1], [2, 1, 2], [1, 2, 3],
    ]) {
      const boundaryMs = deadlineMs - quartersRemaining * quarterMs;
      assert.equal(getSelectionTimerState(timer, boundaryMs - 1).phase, previousPhase);
      assert.equal(getSelectionTimerState(timer, boundaryMs).phase, nextPhase);
      assert.equal(getSelectionTimerState(timer, boundaryMs + 1).phase, nextPhase);
    }
  });
}

test("countdown rounds remaining minutes up and displays only hours and minutes", () => {
  const timer = { durationHours: 48 as const, endsAt };
  assert.equal(getSelectionTimerState(timer, deadlineMs - 25 * hourMs - 1).text, "25:01");
  assert.equal(getSelectionTimerState(timer, deadlineMs - hourMs).text, "01:00");
  assert.equal(getSelectionTimerState(timer, deadlineMs - 60_001).text, "00:02");
  assert.equal(getSelectionTimerState(timer, deadlineMs - 60_000).text, "00:01");
  assert.deepEqual(getSelectionTimerState(timer, deadlineMs - 1), {
    text: "00:01", phase: 3, expired: false,
  });
});

test("expiry stays at zero without restarting or displaying negative time", () => {
  const timer = { durationHours: 24 as const, endsAt };
  for (const nowMs of [deadlineMs, deadlineMs + 1, deadlineMs + 72 * hourMs]) {
    assert.deepEqual(getSelectionTimerState(timer, nowMs), {
      text: "00:00", phase: 3, expired: true,
    });
  }
});

test("timer schema accepts only supported durations and UTC deadlines", () => {
  for (const durationHours of [24, 48]) {
    const selectionTimer = { durationHours, endsAt };
    assert.deepEqual(buyerFieldsSchema.parse({ selectionTimer }).selectionTimer, selectionTimer);
  }
  assert.equal(buyerFieldsSchema.parse({}).selectionTimer, undefined);
  assert.equal(buyerFieldsSchema.parse({ selectionTimer: null }).selectionTimer, null);
  for (const selectionTimer of [
    { durationHours: 12, endsAt },
    { durationHours: "24", endsAt },
    { durationHours: 24, endsAt: "not-a-date" },
    { durationHours: 24, endsAt: "2026-09-22T12:00:00" },
    { durationHours: 24, endsAt: "2026-09-22T12:00:00+03:00" },
  ]) {
    assert.equal(selectionTimerSchema.safeParse(selectionTimer).success, false);
    assert.equal(buyerFieldsSchema.safeParse({ selectionTimer }).success, false);
  }
});
