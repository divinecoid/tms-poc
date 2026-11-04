export type FuelReading = {
  at: number; // epoch ms
  liters: number; // hasil baca sensor
  speedKmh: number;
  ignition: boolean;
  lat: number;
  lng: number;
  odoKm: number;
};

export type Receipt = { vehicleId: string; at: number; liters: number };

export type UnitSeries = {
  unitId: string;
  plate: string;
  vehicleType: string;
  driver: string;
  tankLiters: number;
  readings: FuelReading[];
};

export type FuelDataset = { from: number; to: number; units: UnitSeries[]; receipts: Receipt[] };

export type FuelEventType =
  | "SIPHON_STATIONARY"
  | "FUEL_LOSS_MOVING"
  | "UNRECORDED_REFUEL"
  | "RECEIPT_MISMATCH"
  | "EXCESS_IDLE"
  | "SENSOR_FLATLINE"
  | "REFUEL";

export type Severity = "HIGH" | "MEDIUM" | "LOW";
export type ReviewStatus = "OPEN" | "REVIEWING" | "CONFIRMED" | "DISMISSED";

export type FuelEvent = {
  key: string; // stabil: unit:tipe:waktu
  unitId: string;
  plate: string;
  type: FuelEventType;
  kind: "ALERT" | "INFO";
  severity: Severity;
  at: number;
  endAt: number;
  liters: number;
  receiptLiters?: number;
  lat: number;
  lng: number;
  title: string;
  detail: string;
  status: ReviewStatus;
  note?: string;
};

export type Review = { status: ReviewStatus; note: string | null };

export const eventTypeLabel: Record<FuelEventType, string> = {
  SIPHON_STATIONARY: "Penyedotan saat berhenti",
  FUEL_LOSS_MOVING: "BBM hilang saat jalan",
  UNRECORDED_REFUEL: "Pengisian tanpa struk",
  RECEIPT_MISMATCH: "Struk tidak cocok",
  EXCESS_IDLE: "Mesin menyala terlalu lama",
  SENSOR_FLATLINE: "Sensor tidak bergerak",
  REFUEL: "Pengisian wajar",
};
