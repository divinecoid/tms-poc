import { fuelBadges } from "../fuel/view";
import { demoFleet, type FleetSnapshot } from "./demo-fleet";

/** Snapshot armada untuk peta. Data BBM hanya disertakan untuk peran yang berhak melihatnya. */
export function getFleetSnapshot(now: Date = new Date(), includeFuel = false): FleetSnapshot {
  const snap = demoFleet(now);
  if (!includeFuel) return snap;
  const badges = fuelBadges(now.getTime());
  return { ...snap, units: snap.units.map((u) => ({ ...u, fuel: badges.get(u.id) })) };
}
