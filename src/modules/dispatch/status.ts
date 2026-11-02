export const tripFlow = [
  "ASSIGNED", "EN_ROUTE_PICKUP", "AT_PICKUP", "LOADED", "IN_TRANSIT", "AT_DROP", "DELIVERED", "SETTLED",
] as const;
export type TripStatus = (typeof tripFlow)[number] | "CANCELLED";

export const statusLabel: Record<string, string> = {
  ASSIGNED: "Ditugaskan", EN_ROUTE_PICKUP: "Menuju pickup", AT_PICKUP: "Di lokasi pickup",
  LOADED: "Muatan naik", IN_TRANSIT: "Dalam perjalanan", AT_DROP: "Di lokasi drop",
  DELIVERED: "Terkirim", SETTLED: "Settled", CANCELLED: "Dibatalkan",
};

export function nextStatus(s: string): (typeof tripFlow)[number] | null {
  const i = tripFlow.indexOf(s as (typeof tripFlow)[number]);
  return i >= 0 && i < tripFlow.length - 1 ? tripFlow[i + 1] : null;
}

export const activeTripStatuses = ["ASSIGNED", "EN_ROUTE_PICKUP", "AT_PICKUP", "LOADED", "IN_TRANSIT", "AT_DROP"] as const;

/** GPS hanya direkam sejak driver berangkat sampai tiba di drop. */
export const trackingStatuses = ["EN_ROUTE_PICKUP", "AT_PICKUP", "LOADED", "IN_TRANSIT", "AT_DROP"] as const;
