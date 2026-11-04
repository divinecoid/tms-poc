export const STEP_MS = 10 * 60_000; // interval pembacaan sensor
export const STEP_H = STEP_MS / 3_600_000;

/** Asumsi harga solar non-subsidi (Rp/liter) untuk menaksir nilai kerugian. Ubah sesuai harga riil. */
export const FUEL_PRICE_PER_L = 12_000;

/** Konsumsi mesin menyala tanpa bergerak (liter/jam). */
export const IDLE_L_PER_H = 3.2;

export const TANK_LITERS: Record<string, number> = { CDE: 80, CDD: 100, Fuso: 200, Wingbox: 300, Tronton: 400 };
export const L_PER_100KM: Record<string, number> = { CDE: 11, CDD: 14, Fuso: 20, Wingbox: 28, Tronton: 34 };

export const tankOf = (vehicleType: string) => TANK_LITERS[vehicleType] ?? 200;
export const lPer100Of = (vehicleType: string) => L_PER_100KM[vehicleType] ?? 25;
