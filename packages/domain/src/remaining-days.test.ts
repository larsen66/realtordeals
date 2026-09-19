import assert from "node:assert/strict";
import { test } from "node:test";
import { formatRemainingDays } from "./remaining-days.js";

const now = new Date("2026-09-19T12:00:00+03:00");

test("formatRemainingDays counts whole days from today", () => {
  assert.equal(formatRemainingDays(null, now), "—");
  assert.equal(formatRemainingDays("2026-09-19T11:00:00+03:00", now), "сегодня");
  assert.equal(formatRemainingDays("2026-09-20T11:00:00+03:00", now), "остался 1 день");
  assert.equal(formatRemainingDays("2026-09-21T11:00:00+03:00", now), "осталось 2 дня");
  assert.equal(formatRemainingDays("2026-09-24T11:00:00+03:00", now), "осталось 5 дней");
  assert.equal(
    formatRemainingDays("2026-09-18T11:00:00+03:00", now),
    "просрочено на 1 день",
  );
  assert.equal(
    formatRemainingDays("2026-09-17T11:00:00+03:00", now),
    "просрочено на 2 дня",
  );
});
