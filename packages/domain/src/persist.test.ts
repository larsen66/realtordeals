import assert from "node:assert/strict";
import { test } from "node:test";
import { PersistCardError, assertCanPersistCard } from "./persist.js";
import { parseCreateCardInput, parsePatchCardInput } from "./card.js";

test("assertCanPersistCard requires phone, role and dealType", () => {
  assert.throws(
    () => assertCanPersistCard({ role: "buyer", dealType: "purchase" }),
    PersistCardError,
  );
  assert.throws(
    () =>
      assertCanPersistCard({
        role: "buyer",
        dealType: "purchase",
        phone: "   ",
      }),
    PersistCardError,
  );
  assert.deepEqual(
    assertCanPersistCard({
      role: "seller",
      dealType: "sale",
      phone: "  +79990001122  ",
    }),
    { role: "seller", dealType: "sale", phone: "+79990001122" },
  );
});

test("parseCreateCardInput sets buyer stage and rejects seller stage", () => {
  const buyer = parseCreateCardInput({
    role: "buyer",
    dealType: "purchase",
    phone: "+79990001122",
  });
  assert.equal(buyer.stage, "selection");
  assert.equal(buyer.selectionStatus, "waiting");
  assert.equal(buyer.referralStatus, null);
  assert.deepEqual(buyer.tags, ["Покупатель", "Покупка"]);

  assert.throws(() =>
    parseCreateCardInput({
      role: "seller",
      dealType: "sale",
      phone: "+79990001122",
      stage: "selection",
    }),
  );

  const seller = parseCreateCardInput({
    role: "seller",
    dealType: "sale",
    phone: "+79990001122",
  });
  assert.equal(seller.stage, null);
  assert.equal(seller.selectionStatus, null);
  assert.equal(seller.referralStatus, null);
  assert.deepEqual(seller.tags, ["Продавец", "Продажа"]);
});

test("parsePatchCardInput normalizes stage extras", () => {
  const viewing = parsePatchCardInput(
    { stage: "viewing" },
    {
      role: "buyer",
      stage: "selection",
      selectionStatus: "waiting",
      referralStatus: null,
    },
  );
  assert.equal(viewing.stage, "viewing");
  assert.equal(viewing.selectionStatus, null);
  assert.equal(viewing.referralStatus, null);

  const referral = parsePatchCardInput(
    { stage: "referral" },
    {
      role: "buyer",
      stage: "deal",
      selectionStatus: null,
      referralStatus: null,
    },
  );
  assert.equal(referral.referralStatus, "not_posted");

  const seller = parsePatchCardInput(
    { role: "seller" },
    {
      role: "buyer",
      stage: "selection",
      selectionStatus: "waiting",
      referralStatus: null,
    },
  );
  assert.equal(seller.stage, null);
  assert.equal(seller.selectionStatus, null);
  assert.equal(seller.referralStatus, null);
});
