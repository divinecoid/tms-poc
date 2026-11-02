import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderStops, pods, tripEvents, tripExpenses, tripStops, trips, vendorBills } from "@/db/schema";
import { can, type Role } from "@/lib/auth/permissions";
import { nextStatus } from "./status";

export async function ordersOfTrip(tripId: string) {
  const rows = await db
    .selectDistinct({ id: orderStops.orderId })
    .from(tripStops)
    .innerJoin(orderStops, eq(orderStops.id, tripStops.orderStopId))
    .where(eq(tripStops.tripId, tripId));
  return rows.map((r) => r.id);
}

type Opts = { driverId?: string; lat?: string; lng?: string; note?: string };

/** Satu-satunya jalur pindah status trip (dispatcher maupun driver). */
export async function applyAdvance(
  tripId: string,
  actor: { id: string; role: Role },
  opts: Opts = {},
): Promise<{ error?: string }> {
  return db.transaction(async (tx) => {
    const [trip] = await tx.select().from(trips).where(eq(trips.id, tripId)).for("update");
    if (!trip) return { error: "Trip tidak ditemukan" };
    if (opts.driverId && trip.driverId !== opts.driverId) return { error: "Bukan trip Anda" };
    const next = nextStatus(trip.status);
    if (!next) return { error: "Status sudah final" };
    if (next === "SETTLED" && (opts.driverId || !can(actor.role, "write", "expenses"))) {
      return { error: "Tidak punya akses settlement" };
    }
    let settleNote: string | undefined;
    if (next === "SETTLED") {
      if (trip.fulfillment === "VENDOR") {
        const [bill] = await tx.select({ status: vendorBills.status }).from(vendorBills).where(eq(vendorBills.tripId, tripId));
        if (bill?.status !== "PAID") return { error: "Tagihan vendor belum dibayar" };
      } else {
        const exp = await tx.select().from(tripExpenses).where(eq(tripExpenses.tripId, tripId));
        const pending = exp.filter((e) => e.status === "PENDING").length;
        if (pending) return { error: `${pending} pengeluaran masih menunggu persetujuan` };
        const used = exp.filter((e) => e.status === "APPROVED").reduce((a, e) => a + Number(e.amount), 0);
        const adv = Number(trip.advanceAmount ?? 0);
        settleNote = `Uang jalan ${adv}, pengeluaran disetujui ${used}, selisih ${adv - used}`;
      }
    }
    if (next === "DELIVERED" && actor.role !== "owner") {
      const missing = await tx
        .select({ id: tripStops.id })
        .from(tripStops)
        .innerJoin(orderStops, eq(orderStops.id, tripStops.orderStopId))
        .leftJoin(pods, eq(pods.tripStopId, tripStops.id))
        .where(and(eq(tripStops.tripId, tripId), eq(orderStops.type, "DROP"), isNull(pods.id)));
      if (missing.length) return { error: `e-POD belum lengkap (${missing.length} drop)` };
    }

    const now = new Date();
    await tx
      .update(trips)
      .set({
        status: next,
        updatedAt: now,
        ...(next === "EN_ROUTE_PICKUP" && !trip.actualStart ? { actualStart: now } : {}),
        ...(next === "DELIVERED" ? { actualEnd: now } : {}),
      })
      .where(eq(trips.id, tripId));
    await tx.insert(tripEvents).values({
      tripId, status: next, note: opts.note || settleNote || null, lat: opts.lat ?? null, lng: opts.lng ?? null, createdBy: actor.id,
    });

    const orderIds = await ordersOfTrip(tripId);
    if (next === "EN_ROUTE_PICKUP") {
      await tx.update(orders).set({ status: "IN_PROGRESS", updatedAt: now })
        .where(and(inArray(orders.id, orderIds), eq(orders.status, "SCHEDULED")));
    }
    if (next === "DELIVERED") {
      // order DELIVERED hanya jika semua trip-nya sudah terkirim
      for (const oid of orderIds) {
        const open = await tx
          .selectDistinct({ id: trips.id })
          .from(tripStops)
          .innerJoin(trips, eq(trips.id, tripStops.tripId))
          .innerJoin(orderStops, eq(orderStops.id, tripStops.orderStopId))
          .where(and(eq(orderStops.orderId, oid), notInArray(trips.status, ["DELIVERED", "SETTLED", "CANCELLED"])));
        if (open.length === 0) {
          await tx.update(orders).set({ status: "DELIVERED", updatedAt: now }).where(eq(orders.id, oid));
        }
      }
    }
    return {};
  });
}
