import { pingPong, pointAlong, routeLengthKm, type LatLng } from "./geo";
import { routes, specs } from "./roster";

export type UnitStatus = "MOVING" | "STOPPED" | "OFFLINE";

export type FleetUnit = {
  id: string;
  plate: string;
  vehicleType: string;
  driver: string;
  tripNo: string;
  customer: string;
  cargo: string;
  routeLabel: string;
  status: UnitStatus;
  lat: number;
  lng: number;
  heading: number;
  speedKmh: number;
  lastUpdate: string; // ISO
  routePath: LatLng[];
  /** Hanya terisi untuk pengguna yang berhak melihat data BBM. */
  fuel?: { pct: number; liters: number; alerts: number };
};

export type FleetSnapshot = { source: "DEMO" | "GPS"; at: string; units: FleetUnit[] };

// Simulasi dipercepat agar pergerakan terlihat di peta pada interval refresh beberapa detik.
export const TIME_ACCELERATION = 25;

/** Posisi armada simulasi pada waktu `now`: deterministik, jadi hasilnya sama di server mana pun. */
export function demoFleet(now: Date = new Date()): FleetSnapshot {
  const seconds = now.getTime() / 1000;
  const units = specs.map((s): FleetUnit => {
    const { label, path } = routes[s.route];
    const L = routeLengthKm(path);
    let lat: number, lng: number, heading: number, speed = 0, status: UnitStatus;
    let last = now;

    if (s.mode === "move") {
      const jitter = Math.sin(seconds / 40 + s.offsetKm) * 7; // variasi kecepatan wajar
      speed = Math.round(s.cruise + jitter);
      const d = s.offsetKm + (seconds / 3600) * s.cruise * TIME_ACCELERATION;
      const { km, returning } = pingPong(d, L);
      const p = pointAlong(path, km);
      [lat, lng] = p.pos;
      heading = returning ? (p.heading + 180) % 360 : p.heading;
      status = "MOVING";
    } else {
      const fixed = pointAlong(path, L * (s.at ?? 0));
      [lat, lng] = fixed.pos;
      heading = fixed.heading;
      status = s.mode === "offline" ? "OFFLINE" : "STOPPED";
      if (s.minutesAgo) last = new Date(now.getTime() - s.minutesAgo * 60_000);
    }
    return {
      id: s.id, plate: s.plate, vehicleType: s.vehicleType, driver: s.driver, tripNo: s.tripNo, customer: s.customer,
      cargo: s.cargo, routeLabel: label, status, lat: +lat.toFixed(6), lng: +lng.toFixed(6),
      heading: Math.round(heading), speedKmh: Math.max(0, speed), lastUpdate: last.toISOString(), routePath: path,
    };
  });
  return { source: "DEMO", at: now.toISOString(), units };
}

