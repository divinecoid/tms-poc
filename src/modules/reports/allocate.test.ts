import assert from "node:assert/strict";
import { test } from "node:test";
import { allocateCost, chargeableWeight } from "./allocate";

const sum = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

test("satu order menanggung seluruh biaya", () => {
  assert.equal(allocateCost(1_000_000, [{ id: "a", weight: 500 }]).get("a"), 1_000_000);
});

test("proporsional dengan bobot", () => {
  const m = allocateCost(2_100_000, [{ id: "a", weight: 600 }, { id: "b", weight: 1500 }]);
  assert.equal(m.get("a"), 600_000);
  assert.equal(m.get("b"), 1_500_000);
});

test("total hasil selalu sama dengan biaya meski pembulatan", () => {
  for (const cost of [100, 1000, 999_999, 1_234_567]) {
    const m = allocateCost(cost, [{ id: "a", weight: 1 }, { id: "b", weight: 1 }, { id: "c", weight: 1 }]);
    assert.equal(sum(m), cost);
  }
});

test("bobot nol semua: dibagi rata", () => {
  const m = allocateCost(900, [{ id: "a", weight: 0 }, { id: "b", weight: 0 }, { id: "c", weight: 0 }]);
  assert.deepEqual([...m.values()], [300, 300, 300]);
});

test("biaya nol dan daftar kosong aman", () => {
  assert.equal(sum(allocateCost(0, [{ id: "a", weight: 5 }])), 0);
  assert.equal(allocateCost(100, []).size, 0);
});

test("chargeable weight memakai yang lebih besar antara kg dan volume", () => {
  assert.equal(chargeableWeight(100, 2), 500);
  assert.equal(chargeableWeight(900, 2), 900);
});
