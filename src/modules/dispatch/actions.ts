"use server";

import { randomBytes } from "node:crypto";
import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  cargoItems, drivers, orders, orderStops, tripEvents, tripExpenses, tripStops, trips, vehicles,
} from "@/db/schema";
import { requireCan } from "@/lib/auth/session";
import { nextDocNo } from "@/lib/doc-number";
import { activeTripStatuses } from "./status";
import { savePod } from "@/modules/driver/pod";
import { applyAdvance, ordersOfTrip } from "./transition";
import { tripInput } from "./schema";

export type CreateTripResult = { error?: string; id?: string };

class UserError extends Error {}

export async function createTrip(raw: unknown): Promise<CreateTripResult> {
  const user = await requireCan("write", "dispatch");
  const parsed = tripInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const v = parsed.data;

  try {
    const id = await db.transaction(async (tx) => {
      // kunci order agar tidak di-dispatch ganda
      const locked = await tx
        .select({ id: orders.id, status: orders.status, orderNo: orders.orderNo })
        .from(orders)
        .where(inArray(orders.id, v.orderIds))
        .for("update");
      if (locked.length !== v.orderIds.length) throw new UserError("Order tidak ditemukan");
      const bad = locked.find((o) => o.status !== "CONFIRMED");
      if (bad) throw new UserError(`Order ${bad.orderNo} tidak berstatus CONFIRMED`);

      const stops = await tx
        .select({ id: orderStops.id, orderId: orderStops.orderId, seq: orderStops.seq, type: orderStops.type })
        .from(orderStops)
        .where(inArray(orderStops.orderId, v.orderIds))
        .orderBy(asc(orderStops.orderId), asc(orderStops.seq));
      const cargo = await tx
        .select({ weightKg: cargoItems.weightKg, cbm: cargoItems.cbm, stopId: cargoItems.orderStopId, type: orderStops.type })
        .from(cargoItems)
        .innerJoin(orderStops, eq(orderStops.id, cargoItems.orderStopId))
        .where(inArray(orderStops.orderId, v.orderIds));
      // muatan dihitung dari sisi pickup agar tidak dobel dengan sisi drop
      const loadKg = cargo.filter((c) => c.type === "PICKUP").reduce((a, c) => a + Number(c.weightKg ?? 0), 0);
      const loadCbm = cargo.filter((c) => c.type === "PICKUP").reduce((a, c) => a + Number(c.cbm ?? 0), 0);

      let vehicle: typeof vehicles.$inferSelect | undefined;
      if (v.fulfillment === "OWN") {
        [vehicle] = await tx.select().from(vehicles).where(eq(vehicles.id, v.vehicleId!)).for("update");
        if (!vehicle) throw new UserError("Kendaraan tidak ditemukan");
        const [driver] = await tx.select().from(drivers).where(eq(drivers.id, v.driverId!));
        if (!driver) throw new UserError("Driver tidak ditemukan");
        if (vehicle.capacityKg && loadKg > vehicle.capacityKg)
          throw new UserError(`Muatan ${loadKg} kg melebihi kapasitas ${vehicle.plateNo} (${vehicle.capacityKg} kg)`);
        if (vehicle.capacityCbm && loadCbm > Number(vehicle.capacityCbm))
          throw new UserError(`Volume ${loadCbm} CBM melebihi kapasitas ${vehicle.plateNo}`);
        const busy = await tx
          .select({ no: trips.tripNo })
          .from(trips)
          .where(and(
            inArray(trips.status, [...activeTripStatuses]),
            sql`(${trips.vehicleId} = ${v.vehicleId} or ${trips.driverId} = ${v.driverId})`,
          ));
        if (busy.length) throw new UserError(`Kendaraan/driver masih dipakai trip ${busy[0].no}`);
      }

      const tripNo = await nextDocNo(tx, "TRP");
      const [trip] = await tx
        .insert(trips)
        .values({
          tripNo,
          fulfillment: v.fulfillment,
          vehicleId: v.vehicleId ?? null,
          driverId: v.driverId ?? null,
          vendorId: v.vendorId ?? null,
          vendorPlate: v.vendorPlate || null,
          vendorDriverName: v.vendorDriverName || null,
          vendorDriverPhone: v.vendorDriverPhone || null,
          vendorCost: v.vendorCost ?? null,
          trackingToken: randomBytes(16).toString("hex"),
          plannedStart: v.plannedStart ? new Date(v.plannedStart) : null,
        })
        .returning({ id: trips.id });

      // urutan: semua pickup dulu (per order), lalu semua drop
      const ordered = [...stops.filter((s) => s.type === "PICKUP"), ...stops.filter((s) => s.type === "DROP")];
      await tx.insert(tripStops).values(ordered.map((s, i) => ({ tripId: trip.id, seq: i + 1, orderStopId: s.id })));
      await tx.insert(tripEvents).values({ tripId: trip.id, status: "ASSIGNED", createdBy: user.id });
      await tx.update(orders).set({ status: "SCHEDULED", updatedAt: new Date() }).where(inArray(orders.id, v.orderIds));
      return trip.id;
    });
    revalidatePath("/dispatch");
    revalidatePath("/orders");
    return { id };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
}

export async function advanceTrip(tripId: string, note?: string): Promise<{ error?: string }> {
  const user = await requireCan("write", "dispatch");
  const res = await applyAdvance(tripId, { id: user.id, role: user.role }, { note });
  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/${tripId}`);
  revalidatePath("/orders");
  return res;
}

export async function cancelTrip(tripId: string) {
  const user = await requireCan("write", "dispatch");
  await db.transaction(async (tx) => {
    const [trip] = await tx.select().from(trips).where(eq(trips.id, tripId)).for("update");
    if (!trip || trip.status !== "ASSIGNED") return;
    const orderIds = await ordersOfTrip(tripId);
    await tx.update(trips).set({ status: "CANCELLED", updatedAt: new Date() }).where(eq(trips.id, tripId));
    await tx.insert(tripEvents).values({ tripId, status: "CANCELLED", createdBy: user.id });
    await tx.update(orders).set({ status: "CONFIRMED", updatedAt: new Date() }).where(inArray(orders.id, orderIds));
  });
  revalidatePath("/dispatch");
  revalidatePath(`/dispatch/${tripId}`);
  revalidatePath("/orders");
}

export async function setExpenseStatus(expenseId: string, status: "APPROVED" | "REJECTED") {
  await requireCan("write", "expenses");
  const [row] = await db
    .update(tripExpenses)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tripExpenses.id, expenseId), eq(tripExpenses.status, "PENDING")))
    .returning({ tripId: tripExpenses.tripId });
  if (row) revalidatePath(`/dispatch/${row.tripId}`);
}

export async function submitVendorPod(raw: unknown): Promise<{ error?: string }> {
  await requireCan("write", "dispatch");
  const r = await savePod(raw, { vendorTrip: true });
  if (r.tripId) {
    revalidatePath(`/dispatch/${r.tripId}`);
    revalidatePath("/dispatch");
  }
  return r.error ? { error: r.error } : {};
}

export async function setAdvance(tripId: string, amount: string): Promise<{ error?: string }> {
  await requireCan("write", "expenses");
  if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) return { error: "Nominal harus angka" };
  const [row] = await db
    .update(trips)
    .set({ advanceAmount: amount.trim(), updatedAt: new Date() })
    .where(and(eq(trips.id, tripId), eq(trips.fulfillment, "OWN"), notInArray(trips.status, ["SETTLED", "CANCELLED"])))
    .returning({ id: trips.id });
  if (!row) return { error: "Uang jalan hanya bisa diubah untuk trip armada sendiri yang belum settled" };
  revalidatePath(`/dispatch/${tripId}`);
  return {};
}
