import { FUEL_PRICE_PER_L, lPer100Of } from "./constants";
import { detectAll } from "./detect";
import { simulateFuel } from "./sim";
import type { FuelDataset, FuelEvent, FuelReading, Review, ReviewStatus, UnitSeries } from "./types";

export type UnitSummary = {
  unitId: string;
  plate: string;
  vehicleType: string;
  driver: string;
  tankLiters: number;
  levelLiters: number;
  levelPct: number;
  distanceKm: number;
  usedLiters: number; // konsumsi wajar (di luar kehilangan yang terdeteksi)
  kmPerLiter: number | null;
  baselineKmPerLiter: number;
  lossLiters: number;
  openAlerts: number;
};

export type Kpi = {
  openAlerts: number;
  highAlerts: number;
  lossLiters: number;
  lossRupiah: number;
  avgKmPerLiter: number | null;
  baselineKmPerLiter: number | null;
};

export type FuelView = {
  source: "DEMO" | "SENSOR";
  at: number;
  hours: number;
  priceAssumption: number;
  kpi: Kpi;
  units: UnitSummary[];
  events: FuelEvent[];
};

const LOSS_TYPES = new Set(["SIPHON_STATIONARY", "FUEL_LOSS_MOVING"]);

// Hasil simulasi per bucket 10 menit disimpan di memori: dihitung ulang hanya saat ada pembacaan baru.
let memo: { bucket: number; ds: FuelDataset; events: FuelEvent[] } | null = null;
export function getFuel(now = Date.now()) {
  const bucket = Math.floor(now / 600_000);
  if (!memo || memo.bucket !== bucket) {
    const { dataset } = simulateFuel(now);
    memo = { bucket, ds: dataset, events: detectAll(dataset) };
  }
  return memo;
}

function summarize(u: UnitSeries, win: FuelReading[], events: FuelEvent[]): UnitSummary {
  const last = win[win.length - 1] ?? u.readings[u.readings.length - 1];
  const mine = events.filter((e) => e.unitId === u.unitId);
  const lossLiters = mine.filter((e) => LOSS_TYPES.has(e.type)).reduce((a, e) => a + e.liters, 0);
  const refuel = mine.filter((e) => e.type === "REFUEL" || e.type === "UNRECORDED_REFUEL" || e.type === "RECEIPT_MISMATCH").reduce((a, e) => a + e.liters, 0);
  const distanceKm = win.length > 1 ? win[win.length - 1].odoKm - win[0].odoKm : 0;
  const used = win.length > 1 ? Math.max(0, win[0].liters + refuel - last.liters - lossLiters) : 0;
  return {
    unitId: u.unitId,
    plate: u.plate,
    vehicleType: u.vehicleType,
    driver: u.driver,
    tankLiters: u.tankLiters,
    levelLiters: last.liters,
    levelPct: Math.round((last.liters / u.tankLiters) * 100),
    distanceKm: Math.round(distanceKm),
    usedLiters: Math.round(used),
    kmPerLiter: used > 5 && distanceKm > 20 ? +(distanceKm / used).toFixed(2) : null,
    baselineKmPerLiter: +(100 / lPer100Of(u.vehicleType)).toFixed(2),
    lossLiters: Math.round(lossLiters),
    openAlerts: mine.filter((e) => e.kind === "ALERT" && (e.status === "OPEN" || e.status === "REVIEWING")).length,
  };
}

/** Gabungkan hasil deteksi dengan status tinjauan, lalu ringkas untuk rentang `hours` terakhir. */
export function buildFuelView(now: number, hours: number, reviews: Map<string, Review> = new Map()): FuelView {
  const { ds, events: all } = getFuel(now);
  const from = now - hours * 3_600_000;
  const events = all
    .filter((e) => e.at >= from)
    .map((e): FuelEvent => {
      const r = reviews.get(e.key);
      return r ? { ...e, status: r.status as ReviewStatus, note: r.note ?? undefined } : e;
    });
  const units = ds.units.map((u) => summarize(u, u.readings.filter((r) => r.at >= from), events));
  const alerts = events.filter((e) => e.kind === "ALERT");
  const open = alerts.filter((e) => e.status === "OPEN" || e.status === "REVIEWING");
  const lossLiters = alerts.filter((e) => LOSS_TYPES.has(e.type) && e.status !== "DISMISSED").reduce((a, e) => a + e.liters, 0);
  const kmpl = units.filter((u) => u.kmPerLiter != null);
  return {
    source: "DEMO",
    at: now,
    hours,
    priceAssumption: FUEL_PRICE_PER_L,
    kpi: {
      openAlerts: open.length,
      highAlerts: open.filter((e) => e.severity === "HIGH").length,
      lossLiters: Math.round(lossLiters),
      lossRupiah: Math.round(lossLiters) * FUEL_PRICE_PER_L, // dari liter yang ditampilkan, agar angka konsisten
      avgKmPerLiter: kmpl.length ? +(kmpl.reduce((a, u) => a + u.kmPerLiter!, 0) / kmpl.length).toFixed(2) : null,
      baselineKmPerLiter: kmpl.length ? +(kmpl.reduce((a, u) => a + u.baselineKmPerLiter, 0) / kmpl.length).toFixed(2) : null,
    },
    units,
    events,
  };
}

/** Deret level untuk grafik satu unit, dalam bentuk ringkas [waktu, liter, kecepatan]. */
export function unitSeries(now: number, unitId: string, hours: number) {
  const { ds } = getFuel(now);
  const u = ds.units.find((x) => x.unitId === unitId);
  if (!u) return null;
  const from = now - hours * 3_600_000;
  return {
    unitId: u.unitId,
    plate: u.plate,
    tankLiters: u.tankLiters,
    points: u.readings.filter((r) => r.at >= from).map((r) => [r.at, r.liters, r.speedKmh] as [number, number, number]),
  };
}

/** Level BBM terkini per unit + jumlah peringatan terbuka, untuk popup peta tracking. */
export function fuelBadges(now = Date.now()) {
  const { ds, events } = getFuel(now);
  const from = now - 72 * 3_600_000;
  return new Map(
    ds.units.map((u) => {
      const last = u.readings[u.readings.length - 1];
      const alerts = events.filter((e) => e.unitId === u.unitId && e.kind === "ALERT" && e.at >= from).length;
      return [u.unitId, { pct: Math.round((last.liters / u.tankLiters) * 100), liters: Math.round(last.liters), alerts }] as const;
    }),
  );
}
