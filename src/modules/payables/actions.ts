"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tripEvents, trips, vendorBills, vendors } from "@/db/schema";
import { requireCan } from "@/lib/auth/session";
import { addDaysIso, todayJakarta } from "@/lib/dates";
import { nextDocNo } from "@/lib/doc-number";

type Result = { error?: string };

function refresh(tripId?: string | null) {
  revalidatePath("/payables");
  if (tripId) revalidatePath(`/dispatch/${tripId}`);
}

export async function createVendorBill(tripId: string): Promise<Result> {
  await requireCan("write", "payables");
  const res = await db.transaction(async (tx): Promise<Result> => {
    const [trip] = await tx.select().from(trips).where(eq(trips.id, tripId)).for("update");
    if (!trip || trip.fulfillment !== "VENDOR" || !trip.vendorId) return { error: "Bukan trip vendor" };
    if (!["DELIVERED", "SETTLED"].includes(trip.status)) return { error: "Trip belum terkirim (e-POD belum lengkap)" };
    if (!trip.vendorCost || Number(trip.vendorCost) <= 0) return { error: "Biaya vendor belum diisi pada trip" };
    const [dup] = await tx.select({ id: vendorBills.id }).from(vendorBills).where(eq(vendorBills.tripId, tripId));
    if (dup) return { error: "Tagihan untuk trip ini sudah ada" };
    const [vendor] = await tx.select().from(vendors).where(eq(vendors.id, trip.vendorId));
    await tx.insert(vendorBills).values({
      billNo: await nextDocNo(tx, "VB"), vendorId: trip.vendorId, tripId,
      amount: trip.vendorCost, dueAt: addDaysIso(todayJakarta(), vendor?.paymentTermDays ?? 14),
    });
    return {};
  });
  refresh(tripId);
  return res;
}

export async function approveVendorBill(id: string): Promise<Result> {
  await requireCan("write", "payables");
  const [row] = await db
    .update(vendorBills)
    .set({ status: "APPROVED", updatedAt: new Date() })
    .where(and(eq(vendorBills.id, id), eq(vendorBills.status, "PENDING")))
    .returning({ tripId: vendorBills.tripId });
  refresh(row?.tripId);
  return row ? {} : { error: "Tagihan tidak bisa disetujui" };
}

export async function payVendorBill(id: string): Promise<Result> {
  const user = await requireCan("write", "payables");
  const row = await db.transaction(async (tx) => {
    const [bill] = await tx
      .update(vendorBills)
      .set({ status: "PAID", paidAt: todayJakarta(), updatedAt: new Date() })
      .where(and(eq(vendorBills.id, id), eq(vendorBills.status, "APPROVED")))
      .returning({ tripId: vendorBills.tripId });
    if (!bill) return null;
    // tagihan vendor lunas = settlement trip vendor
    if (bill.tripId) {
      const [t] = await tx
        .update(trips)
        .set({ status: "SETTLED", updatedAt: new Date() })
        .where(and(eq(trips.id, bill.tripId), eq(trips.status, "DELIVERED")))
        .returning({ id: trips.id });
      if (t) await tx.insert(tripEvents).values({ tripId: t.id, status: "SETTLED", note: "Tagihan vendor dibayar", createdBy: user.id });
    }
    return bill;
  });
  refresh(row?.tripId);
  return row ? {} : { error: "Tagihan harus berstatus APPROVED untuk dibayar" };
}
