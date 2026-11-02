import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { trips, vendorBills, vendors } from "@/db/schema";

export async function listBills() {
  return db
    .select({
      id: vendorBills.id, billNo: vendorBills.billNo, status: vendorBills.status, amount: vendorBills.amount,
      dueAt: vendorBills.dueAt, paidAt: vendorBills.paidAt, vendor: vendors.name, tripId: trips.id, tripNo: trips.tripNo,
    })
    .from(vendorBills)
    .innerJoin(vendors, eq(vendors.id, vendorBills.vendorId))
    .leftJoin(trips, eq(trips.id, vendorBills.tripId))
    .orderBy(desc(vendorBills.createdAt))
    .limit(200);
}

/** Trip vendor yang sudah terkirim tapi belum ditagihkan. */
export async function listBillableTrips() {
  return db
    .select({
      id: trips.id, tripNo: trips.tripNo, vendor: vendors.name, plate: trips.vendorPlate, cost: trips.vendorCost,
    })
    .from(trips)
    .innerJoin(vendors, eq(vendors.id, trips.vendorId))
    .leftJoin(vendorBills, eq(vendorBills.tripId, trips.id))
    .where(and(eq(trips.fulfillment, "VENDOR"), inArray(trips.status, ["DELIVERED", "SETTLED"]), isNull(vendorBills.id)))
    .orderBy(desc(trips.createdAt));
}
