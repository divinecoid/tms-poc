import { FUEL_PRICE_PER_L, IDLE_L_PER_H, STEP_H, STEP_MS, lPer100Of } from "./constants";
import { eventTypeLabel, type FuelDataset, type FuelEvent, type FuelEventType, type Receipt, type Severity, type UnitSeries } from "./types";

// Ambang deteksi. Disetel konservatif supaya alarm palsu rendah; sesuaikan setelah ada data sensor nyata.
export const RULES = {
  episodeExcessL: 2.2, // selisih per pembacaan (liter) yang dianggap menyimpang dari konsumsi wajar
  stationarySpeed: 3, // km/jam di bawah ini dianggap berhenti
  siphonMinL: 10,
  siphonMinTankPct: 0.06,
  siphonHighTankPct: 0.15,
  movingLossMinL: 12,
  movingLossMinTankPct: 0.05,
  movingLossRatio: 1.6,
  movingLossHighL: 30,
  refuelMinL: 8,
  refuelMinTankPct: 0.04,
  receiptMatchWindowMs: 90 * 60_000,
  receiptToleranceL: 8,
  receiptTolerancePct: 0.08,
  receiptHighDiffL: 20,
  idleMinReadings: 9, // 90 menit
  idleMediumReadings: 24, // 4 jam
  flatlineMinReadings: 12, // 2 jam
  flatlineMinKm: 40,
} as const;

const median3 = (a: number, b: number, c: number) => a + b + c - Math.min(a, b, c) - Math.max(a, b, c);

const fmt = (n: number) => Math.round(n).toLocaleString("id-ID");
const clock = (ms: number) =>
  new Date(ms).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).replace(".", ":");

function make(
  u: UnitSeries, type: FuelEventType, severity: Severity, i0: number, i1: number, liters: number, detail: string, extra: Partial<FuelEvent> = {},
): FuelEvent {
  const r = u.readings[i0];
  return {
    key: `${u.unitId}:${type}:${r.at}`,
    unitId: u.unitId,
    plate: u.plate,
    type,
    kind: type === "REFUEL" ? "INFO" : "ALERT",
    severity,
    at: r.at,
    endAt: u.readings[i1].at,
    liters: +liters.toFixed(1),
    lat: r.lat,
    lng: r.lng,
    title: eventTypeLabel[type],
    detail,
    status: "OPEN",
    ...extra,
  };
}

export function detectUnit(u: UnitSeries, receipts: Receipt[]): FuelEvent[] {
  const r = u.readings;
  const n = r.length;
  const events: FuelEvent[] = [];
  if (n < 3) return events;
  const lPer100 = lPer100Of(u.vehicleType);
  const tank = u.tankLiters;

  const sm = r.map((_, i) => median3(r[Math.max(0, i - 1)].liters, r[i].liters, r[Math.min(n - 1, i + 1)].liters));
  const stationary = (i: number) => r[i].speedKmh < RULES.stationarySpeed;
  const expected = (i: number) => {
    if (!stationary(i)) return ((r[i].odoKm - r[i - 1].odoKm) * lPer100) / 100;
    return r[i].ignition ? IDLE_L_PER_H * STEP_H : 0;
  };

  // 1) Sensor tidak bergerak: nilai identik berulang padahal odometer bertambah.
  const suppressed = new Set<number>();
  for (let i = 1; i < n; ) {
    let j = i;
    while (j < n && Math.abs(r[j].liters - r[j - 1].liters) < 0.05) j++;
    const run = j - i + 1; // jumlah pembacaan identik
    if (run >= RULES.flatlineMinReadings && r[j - 1].odoKm - r[i - 1].odoKm >= RULES.flatlineMinKm) {
      events.push(make(u, "SENSOR_FLATLINE", "MEDIUM", i - 1, j - 1, 0,
        `Sensor menampilkan ${r[i - 1].liters.toFixed(1)} L tanpa berubah selama ${((run * STEP_MS) / 3_600_000).toFixed(1)} jam, padahal truk menempuh ${fmt(r[j - 1].odoKm - r[i - 1].odoKm)} km. Kemungkinan sensor dilepas, diganggu, atau rusak.`));
      for (let k = i - 1; k <= Math.min(n - 1, j + 2); k++) suppressed.add(k);
    }
    i = Math.max(j, i + 1);
  }

  // 2) Penurunan di luar konsumsi wajar -> penyedotan (berhenti) atau kebocoran/pencurian (berjalan).
  const excess = (i: number) => sm[i - 1] - sm[i] - expected(i);
  for (let i = 1; i < n; ) {
    if (suppressed.has(i) || excess(i) <= RULES.episodeExcessL) {
      i++;
      continue;
    }
    let end = i;
    let gap = 0;
    for (let j = i + 1; j < n && gap <= 1; j++) {
      if (!suppressed.has(j) && excess(j) > RULES.episodeExcessL) {
        end = j;
        gap = 0;
      } else gap++;
    }
    let total = 0, dropSum = 0, expSum = 0, allStationary = true;
    for (let j = i; j <= end; j++) {
      total += Math.max(0, excess(j));
      dropSum += Math.max(0, sm[j - 1] - sm[j]);
      expSum += expected(j);
      if (!stationary(j)) allStationary = false;
    }
    const startIdx = i - 1; // pembacaan terakhir sebelum turun
    const minutes = (end - i + 1) * (STEP_MS / 60_000);
    if (allStationary) {
      if (total >= Math.max(RULES.siphonMinL, RULES.siphonMinTankPct * tank)) {
        const high = total >= RULES.siphonHighTankPct * tank;
        events.push(make(u, "SIPHON_STATIONARY", high ? "HIGH" : "MEDIUM", startIdx, end, total,
          `BBM turun ${fmt(total)} L (${Math.round((total / tank) * 100)}% tangki) dalam ±${minutes} menit saat truk berhenti. Perkiraan nilai ${fmt(total * FUEL_PRICE_PER_L)} rupiah. Pola ini khas penyedotan.`));
      }
    } else if (
      total >= Math.max(RULES.movingLossMinL, RULES.movingLossMinTankPct * tank) &&
      dropSum / Math.max(expSum, 0.1) >= RULES.movingLossRatio
    ) {
      events.push(make(u, "FUEL_LOSS_MOVING", total >= RULES.movingLossHighL ? "HIGH" : "MEDIUM", startIdx, end, total,
        `Saat berjalan BBM turun ${fmt(dropSum)} L, padahal konsumsi wajar sekitar ${fmt(expSum)} L untuk jarak itu (selisih ${fmt(total)} L, ${(dropSum / Math.max(expSum, 0.1)).toFixed(1)}x). Kemungkinan kebocoran atau pencurian di perjalanan.`));
    }
    i = end + 1;
  }

  // 3) Pengisian: cocokkan dengan struk.
  const rise = (i: number) => sm[i] - sm[i - 1];
  const minRise = Math.max(RULES.refuelMinL, RULES.refuelMinTankPct * tank);
  const mine = receipts.filter((x) => x.vehicleId === u.unitId);
  for (let i = 1; i < n; ) {
    if (suppressed.has(i) || rise(i) <= minRise) {
      i++;
      continue;
    }
    let end = i;
    for (let j = i + 1; j < n && rise(j) > minRise; j++) end = j;
    let liters = 0;
    for (let j = i; j <= end; j++) liters += rise(j);
    const t0 = r[i].at;
    const t1 = r[end].at;
    const hit = mine.find((x) => x.at >= t0 - RULES.receiptMatchWindowMs && x.at <= t1 + RULES.receiptMatchWindowMs);
    if (!hit) {
      events.push(make(u, "UNRECORDED_REFUEL", liters >= 100 ? "HIGH" : "MEDIUM", i - 1, end, liters,
        `Tangki bertambah ${fmt(liters)} L pada ${clock(t0)} tetapi tidak ada struk atau pengeluaran BBM yang tercatat. Bisa berarti isi di luar prosedur atau struk tidak dilaporkan.`));
    } else {
      const diff = hit.liters - liters;
      const tol = Math.max(RULES.receiptToleranceL, RULES.receiptTolerancePct * hit.liters);
      if (Math.abs(diff) > tol) {
        const over = diff > 0;
        events.push(make(u, "RECEIPT_MISMATCH", over && diff >= RULES.receiptHighDiffL ? "HIGH" : over ? "MEDIUM" : "LOW", i - 1, end, liters,
          over
            ? `Struk tertulis ${fmt(hit.liters)} L, sensor hanya mencatat ${fmt(liters)} L masuk tangki (selisih ${fmt(diff)} L, sekitar ${fmt(diff * FUEL_PRICE_PER_L)} rupiah). Indikasi mark-up struk atau BBM tidak sampai ke tangki.`
            : `Sensor mencatat ${fmt(liters)} L masuk tangki, lebih besar dari struk ${fmt(hit.liters)} L. Periksa kalibrasi sensor atau struk yang tidak lengkap.`,
          { receiptLiters: hit.liters }));
      } else {
        events.push(make(u, "REFUEL", "LOW", i - 1, end, liters,
          `Pengisian ${fmt(liters)} L cocok dengan struk ${fmt(hit.liters)} L.`, { receiptLiters: hit.liters }));
      }
    }
    i = end + 1;
  }

  // 4) Mesin menyala diam terlalu lama.
  for (let i = 0; i < n; ) {
    if (!(r[i].ignition && stationary(i))) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && r[j + 1].ignition && stationary(j + 1)) j++;
    const len = j - i + 1;
    if (len >= RULES.idleMinReadings) {
      const hours = (len * STEP_MS) / 3_600_000;
      events.push(make(u, "EXCESS_IDLE", len >= RULES.idleMediumReadings ? "MEDIUM" : "LOW", i, j, hours * IDLE_L_PER_H,
        `Mesin menyala tanpa bergerak selama ${hours.toFixed(1)} jam (±${fmt(hours * IDLE_L_PER_H)} L terbuang, sekitar ${fmt(hours * IDLE_L_PER_H * FUEL_PRICE_PER_L)} rupiah).`));
    }
    i = j + 1;
  }

  return events.sort((a, b) => a.at - b.at);
}

export function detectAll(ds: FuelDataset): FuelEvent[] {
  return ds.units.flatMap((u) => detectUnit(u, ds.receipts)).sort((a, b) => b.at - a.at);
}
