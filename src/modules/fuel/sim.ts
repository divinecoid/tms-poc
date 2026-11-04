import { pingPong, pointAlong, routeLengthKm } from "../tracking/geo";
import { routes, specs } from "../tracking/roster";
import { IDLE_L_PER_H, STEP_H, STEP_MS, lPer100Of, tankOf } from "./constants";
import type { FuelDataset, FuelEventType, FuelReading, Receipt, UnitSeries } from "./types";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const WIB = 7 * HOUR;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const rnd = (key: string) => hash(key) / 4294967295;
const noise = (key: string, amp: number) => (rnd(key) * 2 - 1) * amp;

/** Awal bulan berjalan pukul 00.00 WIB. Simulasi dimulai dari sini agar kejadian stabil sepanjang bulan. */
export function monthAnchor(now: number) {
  const d = new Date(now + WIB);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - WIB;
}

/** Kejadian yang sengaja disisipkan (kebenaran dasar), dipakai untuk menguji mesin deteksi. */
export type Truth = { type: FuelEventType; unitId: string; at: number };

export type SimResult = { dataset: FuelDataset; truth: Truth[] };

export function simulateFuel(now: number): SimResult {
  const anchor = monthAnchor(now);
  const end = Math.floor(now / STEP_MS) * STEP_MS;
  const units: UnitSeries[] = [];
  const receipts: Receipt[] = [];
  const truth: Truth[] = [];

  for (const spec of specs) {
    const { path } = routes[spec.route];
    const L = routeLengthKm(path);
    const tank = tankOf(spec.vehicleType);
    const lPer100 = lPer100Of(spec.vehicleType);
    const isMover = spec.mode !== "stop";
    const readings: FuelReading[] = [];

    let level = tank * (0.65 + rnd(`${spec.id}:init`) * 0.25);
    let odo = 18000 + Math.floor(rnd(`${spec.id}:odo`) * 60000);
    let progress = spec.offsetKm;
    let frozen: number | null = null;
    const refuelledToday = new Set<number>();

    for (let t = anchor; t <= end; t += STEP_MS) {
      const local = t - anchor;
      const day = Math.floor(local / DAY);
      const hour = (local % DAY) / HOUR;
      const key = `${spec.id}:${t}`;
      const slot = Math.round(hour * 6); // indeks 10-menit dalam sehari

      const moving = isMover && ((hour >= 5 && hour < 11) || (hour >= 12.5 && hour < 18));
      const idling = !isMover && spec.id === "u7" && day % 2 === 0 && hour >= 8 && hour < 13;
      const speed = moving ? Math.max(20, Math.round(spec.cruise + noise(`${key}:v`, 8))) : 0;
      const ignition = moving || idling;
      const dist = speed * STEP_H;
      const burn = speed > 0 ? (dist * lPer100) / 100 : idling ? IDLE_L_PER_H * STEP_H : 0;

      // --- kejadian yang disisipkan ---
      let extraLoss = 0;
      if (spec.id === "u2" && day % 4 === 2 && moving && hour >= 14 && hour < 15) {
        extraLoss = 4.5; // kebocoran / penyedotan saat berjalan
        if (hour === 14) truth.push({ type: "FUEL_LOSS_MOVING", unitId: spec.id, at: t });
      }
      if (spec.id === "u6" && day % 3 === 1 && (slot === 14 || slot === 15)) {
        const total = Math.min(tank * (0.22 + rnd(`${spec.id}:${day}:theft`) * 0.18), level - tank * 0.05);
        if (total > 0) {
          extraLoss = slot === 14 ? total * 0.6 : total * 0.4;
          if (slot === 14) truth.push({ type: "SIPHON_STATIONARY", unitId: spec.id, at: t });
        }
      }

      level = Math.max(tank * 0.02, level - burn - extraLoss);
      progress += dist;
      odo += dist;

      // --- pengisian BBM ---
      let added = 0;
      let receiptLiters: number | null = null;
      const scriptedMismatch = spec.id === "u5" && day % 4 === 0 && slot === 70; // 11:40
      const scriptedUnrecorded = spec.id === "u3" && day % 5 === 3 && slot === 71; // 11:50
      if (scriptedMismatch || scriptedUnrecorded) {
        added = tank * 0.97 - level;
        if (added >= 20) {
          refuelledToday.add(day);
          if (scriptedMismatch) {
            receiptLiters = Math.round(added) + 28; // struk lebih besar dari yang masuk tangki
            truth.push({ type: "RECEIPT_MISMATCH", unitId: spec.id, at: t });
          } else {
            truth.push({ type: "UNRECORDED_REFUEL", unitId: spec.id, at: t });
          }
        } else added = 0;
      } else if (
        !refuelledToday.has(day) &&
        !(spec.id === "u8" && day % 3 === 0) && // sensor sedang "beku" hari itu
        !(spec.id === "u5" && day % 4 === 0) && // hari skenario struk tidak cocok
        !(spec.id === "u3" && day % 5 === 3) && // hari skenario pengisian tanpa struk
        ((slot === 69 && level < tank * 0.6) || (slot === 108 && level < tank * 0.3) || (level < tank * 0.08 && !moving))
      ) {
        added = tank * 0.95 - level;
        receiptLiters = Math.round(added);
        refuelledToday.add(day);
      }
      level += added;
      if (receiptLiters != null) receipts.push({ vehicleId: spec.id, at: t, liters: receiptLiters });

      // --- sensor ---
      const flat = spec.id === "u8" && day % 3 === 0 && hour >= 10 && hour < 16;
      let reported: number;
      if (flat) {
        if (frozen == null) {
          frozen = level;
          truth.push({ type: "SENSOR_FLATLINE", unitId: spec.id, at: t });
        }
        reported = frozen;
      } else {
        frozen = null;
        reported = level + noise(`${key}:n`, 0.7) + (moving ? noise(`${key}:s`, 1.1) : 0);
      }

      if (idling && hour === 8) truth.push({ type: "EXCESS_IDLE", unitId: spec.id, at: t });

      const km = isMover ? pingPong(progress, L).km : L * (spec.at ?? 0);
      const p = pointAlong(path, km);
      readings.push({
        at: t,
        liters: +Math.max(0, reported).toFixed(1),
        speedKmh: speed,
        ignition,
        lat: +p.pos[0].toFixed(5),
        lng: +p.pos[1].toFixed(5),
        odoKm: +odo.toFixed(1),
      });
    }

    units.push({ unitId: spec.id, plate: spec.plate, vehicleType: spec.vehicleType, driver: spec.driver, tankLiters: tank, readings });
  }

  return { dataset: { from: anchor, to: end, units, receipts }, truth };
}
