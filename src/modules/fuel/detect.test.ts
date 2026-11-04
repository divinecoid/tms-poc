import assert from "node:assert/strict";
import { test } from "node:test";
import { STEP_MS } from "./constants";
import { detectAll, detectUnit } from "./detect";
import { monthAnchor, simulateFuel } from "./sim";
import type { FuelReading, UnitSeries } from "./types";

// ---------- pembangun deret sintetis ----------
function series(levels: number[], opts: { speed?: number | ((i: number) => number); ignition?: (i: number) => boolean; tank?: number; type?: string } = {}): UnitSeries {
  let odo = 1000;
  const readings: FuelReading[] = levels.map((liters, i) => {
    const speed = typeof opts.speed === "function" ? opts.speed(i) : (opts.speed ?? 0);
    odo += speed / 6;
    return { at: 1_000_000 + i * STEP_MS, liters, speedKmh: speed, ignition: opts.ignition ? opts.ignition(i) : speed > 0, lat: -6.2, lng: 106.8, odoKm: odo };
  });
  return { unitId: "t1", plate: "B 1 TES", vehicleType: opts.type ?? "Fuso", driver: "-", tankLiters: opts.tank ?? 200, readings };
}
const flat = (n: number, v: number) => Array.from({ length: n }, () => v);
const types = (u: UnitSeries, r: { vehicleId: string; at: number; liters: number }[] = []) => detectUnit(u, r).map((e) => e.type);

test("tidak ada alarm untuk konsumsi normal dengan noise sensor", () => {
  // Fuso 20 L/100km, 60 km/jam -> 12 L/jam = 2 L per 10 menit
  const lv = Array.from({ length: 60 }, (_, i) => 180 - i * 2 + (i % 3 === 0 ? 1.1 : i % 3 === 1 ? -0.9 : 0.2));
  assert.deepEqual(types(series(lv, { speed: 60 })), []);
});

test("penyedotan saat berhenti terdeteksi dan tidak ikut kalau hanya lonjakan satu pembacaan", () => {
  const siphon = [...flat(10, 150), 130, 112, ...flat(10, 112)];
  const ev = detectUnit(series(siphon), []);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].type, "SIPHON_STATIONARY");
  assert.ok(Math.abs(ev[0].liters - 38) < 1.5, String(ev[0].liters));
  assert.equal(ev[0].severity, "HIGH"); // 38 L = 19% tangki (>= 15%)
});

test("lonjakan sesaat satu pembacaan (gelombang BBM) tidak dianggap pencurian", () => {
  const spike = [...flat(10, 150), 138, ...flat(10, 150)];
  assert.deepEqual(types(series(spike)), []);
});

test("kebocoran saat berjalan terdeteksi, konsumsi normal tidak", () => {
  const lv: number[] = [];
  let cur = 180;
  for (let i = 0; i < 40; i++) {
    cur -= 2 + (i >= 15 && i < 21 ? 4.5 : 0);
    lv.push(cur);
  }
  assert.deepEqual(types(series(lv, { speed: 60 })), ["FUEL_LOSS_MOVING"]);
});

test("pengisian: cocok struk = wajar; tanpa struk = peringatan; struk lebih besar = mark-up", () => {
  const at = (i: number) => 1_000_000 + i * STEP_MS;
  const lv = [...flat(8, 40), 140, ...flat(8, 140)]; // +100 L
  const u = series(lv);
  assert.deepEqual(types(u, [{ vehicleId: "t1", at: at(8), liters: 100 }]), ["REFUEL"]);
  assert.deepEqual(types(u), ["UNRECORDED_REFUEL"]);
  const mm = detectUnit(u, [{ vehicleId: "t1", at: at(8), liters: 128 }]);
  assert.equal(mm.length, 1);
  assert.equal(mm[0].type, "RECEIPT_MISMATCH");
  assert.equal(mm[0].severity, "HIGH");
  assert.equal(mm[0].receiptLiters, 128);
});

test("mesin menyala diam >= 90 menit dicatat; singkat tidak", () => {
  const lvLong = Array.from({ length: 20 }, (_, i) => 100 - i * 0.53);
  assert.deepEqual(types(series(lvLong, { speed: 0, ignition: () => true })), ["EXCESS_IDLE"]);
  const lvShort = Array.from({ length: 20 }, (_, i) => 100 - i * 0.53);
  assert.deepEqual(types(series(lvShort, { speed: 0, ignition: (i) => i < 5 })), []);
});

test("sensor datar saat truk menempuh jarak jauh ditandai, dan lonjakan sesudahnya tidak dobel dilaporkan", () => {
  const lv = [...Array.from({ length: 10 }, (_, i) => 180 - i * 2), ...flat(14, 162), 100, 98, 96];
  const ev = detectUnit(series(lv, { speed: 60 }), []);
  assert.deepEqual(ev.map((e) => e.type), ["SENSOR_FLATLINE"]);
});

// ---------- terhadap simulasi lengkap ----------
const NOW = Date.parse("2026-11-04T16:00:00+07:00");

test("simulasi: tidak ada alarm palsu dan semua kejadian yang disisipkan terdeteksi", () => {
  const { dataset, truth } = simulateFuel(NOW);
  const alerts = detectAll(dataset).filter((e) => e.kind === "ALERT");

  // setiap kejadian yang disisipkan harus punya alarm bertipe sama pada unit yang sama, dalam 30 menit
  for (const t of truth) {
    const hit = alerts.find((e) => e.unitId === t.unitId && e.type === t.type && Math.abs(e.at - t.at) <= 30 * 60_000);
    assert.ok(hit, `tidak terdeteksi: ${t.type} ${t.unitId} ${new Date(t.at).toISOString()}`);
  }
  // setiap alarm harus berasal dari kejadian yang disisipkan (tanpa alarm palsu)
  for (const e of alerts) {
    const src = truth.find((t) => t.unitId === e.unitId && t.type === e.type && Math.abs(e.at - t.at) <= 30 * 60_000);
    assert.ok(src, `alarm palsu: ${e.type} ${e.unitId} ${new Date(e.at).toISOString()} (${e.liters} L)`);
  }
  assert.equal(alerts.length, truth.length, "jumlah alarm harus sama dengan jumlah kejadian");
});

test("simulasi: tiap jenis kejadian muncul dan tak ada BBM negatif atau di atas kapasitas", () => {
  const { dataset, truth } = simulateFuel(NOW);
  assert.deepEqual([...new Set(truth.map((t) => t.type))].sort(), ["EXCESS_IDLE", "FUEL_LOSS_MOVING", "RECEIPT_MISMATCH", "SENSOR_FLATLINE", "SIPHON_STATIONARY", "UNRECORDED_REFUEL"]);
  for (const u of dataset.units) {
    for (const r of u.readings) assert.ok(r.liters >= 0 && r.liters <= u.tankLiters + 3, `${u.plate} ${r.liters}`);
  }
});

test("simulasi: deterministik dan stabil saat waktu bergeser", () => {
  const a = simulateFuel(NOW).dataset;
  const b = simulateFuel(NOW).dataset;
  assert.deepEqual(a.units[0].readings.slice(0, 5), b.units[0].readings.slice(0, 5));
  // kunci kejadian lama tidak berubah ketika "sekarang" maju satu hari
  const k1 = new Set(detectAll(a).map((e) => e.key));
  const later = detectAll(simulateFuel(NOW + 24 * 3_600_000).dataset).map((e) => e.key);
  for (const k of k1) assert.ok(later.includes(k), `kunci hilang: ${k}`);
});

test("simulasi: bulan baru dimulai dari tanggal 1 pukul 00.00 WIB", () => {
  assert.equal(monthAnchor(Date.parse("2026-11-04T16:00:00+07:00")), Date.parse("2026-11-01T00:00:00+07:00"));
  assert.equal(monthAnchor(Date.parse("2026-12-01T00:30:00+07:00")), Date.parse("2026-12-01T00:00:00+07:00"));
});

test("view: ringkasan, status tinjauan menempel pada kunci kejadian, dan rentang jam memfilter", async () => {
  const { buildFuelView } = await import("./view");
  const v72 = buildFuelView(NOW, 72);
  const v24 = buildFuelView(NOW, 24);
  assert.ok(v72.events.length >= v24.events.length);
  assert.equal(v72.units.length, 8);
  assert.ok(v72.kpi.openAlerts > 0 && v72.kpi.lossLiters > 0);
  assert.equal(v72.kpi.lossRupiah, v72.kpi.lossLiters * v72.priceAssumption);

  const target = v72.events.find((e) => e.type === "SIPHON_STATIONARY")!;
  const reviewed = buildFuelView(NOW, 72, new Map([[target.key, { status: "DISMISSED" as const, note: "alarm palsu" }]]));
  assert.equal(reviewed.events.find((e) => e.key === target.key)!.status, "DISMISSED");
  assert.ok(reviewed.kpi.openAlerts === v72.kpi.openAlerts - 1);
  assert.ok(reviewed.kpi.lossLiters < v72.kpi.lossLiters); // yang ditolak tidak dihitung sebagai kerugian

  for (const u of v72.units) {
    assert.ok(u.levelPct >= 0 && u.levelPct <= 101);
    if (u.kmPerLiter != null) assert.ok(u.kmPerLiter > 0.5 && u.kmPerLiter < 15, `${u.plate} ${u.kmPerLiter}`);
  }
});
