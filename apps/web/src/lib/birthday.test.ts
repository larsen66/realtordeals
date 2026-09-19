import assert from "node:assert/strict";
import { test } from "node:test";
import { isBirthdaySoon } from "./birthday";

const today = new Date("2026-09-19T12:00:00+03:00");

test("birthday is visible only today and during the preceding three days", () => {
  for (const day of [19, 20, 21, 22]) {
    assert.equal(isBirthdaySoon(`1990-09-${day}`, today), true);
  }
  for (const value of ["1990-09-18", "1990-09-23", "1990-12-03", null, "", "invalid", "1990-02-30"]) {
    assert.equal(isBirthdaySoon(value, today), false);
  }
});

test("birthday window crosses the year boundary", () => {
  const now = new Date("2026-12-30T12:00:00+03:00");
  assert.equal(isBirthdaySoon("1990-01-02", now), true);
  assert.equal(isBirthdaySoon("1990-01-03", now), false);
  assert.equal(isBirthdaySoon("1990-12-29", now), false);
});

test("birthday uses Moscow calendar days even near UTC midnight", () => {
  assert.equal(isBirthdaySoon("1990-09-23", new Date("2026-09-19T21:05:00Z")), true);
  assert.equal(isBirthdaySoon("1990-09-19", new Date("2026-09-19T21:05:00Z")), false);
});

test("February 29 is not shifted to March 1 in non-leap years", () => {
  assert.equal(isBirthdaySoon("2000-02-29", new Date("2028-02-26T12:00:00Z")), true);
  assert.equal(isBirthdaySoon("2000-02-29", new Date("2028-02-29T12:00:00Z")), true);
  assert.equal(isBirthdaySoon("2000-02-29", new Date("2027-02-28T12:00:00Z")), false);
  assert.equal(isBirthdaySoon("2001-02-29", today), false);
});
