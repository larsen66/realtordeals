import assert from "node:assert/strict";
import { test } from "node:test";
import { tagsFor } from "./tags.js";

test("tagsFor is derived from role and deal type", () => {
  assert.deepEqual(tagsFor("seller", "sale"), ["Продавец", "Продажа"]);
  assert.deepEqual(tagsFor("buyer", "purchase"), ["Покупатель", "Покупка"]);
});
