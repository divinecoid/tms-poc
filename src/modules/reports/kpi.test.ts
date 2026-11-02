import assert from "node:assert/strict";
import { test } from "node:test";
import { countActiveDays } from "./kpi";

test("hari aktif dihitung unik per kendaraan dan dipotong ke rentang", () => {
  const spans = [
    { key: "v1", start: "2026-10-30", end: "2026-11-02" }, // hanya 1–2 Nov di rentang
    { key: "v1", start: "2026-11-02", end: "2026-11-03" }, // 2 Nov tumpang tindih, jangan dobel
    { key: "v2", start: "2026-11-03", end: "2026-11-03" },
  ];
  assert.equal(countActiveDays(spans, "2026-11-01", "2026-11-05"), 2 + 1 + 1);
});

test("rentang di luar periode tidak dihitung", () => {
  assert.equal(countActiveDays([{ key: "v", start: "2026-09-01", end: "2026-09-30" }], "2026-11-01", "2026-11-05"), 0);
});
