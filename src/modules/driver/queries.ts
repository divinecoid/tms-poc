import { asc, desc, eq, inArray, notInArray, and } from "drizzle-orm";
import { db } from "@/db";
import {
  cargoItems, customers, locations, orders, orderStops, pods, tripExpenses, tripStops, trips, vehicles,
} from "@/db/schema";

export async function listDriverTrips(driverId: string) {
  return db
    .select({ id: trips.id, tripNo: trips.tripNo, status: trips.status, plate: vehicles.plateNo, plannedStart: trips.plannedStart })
    .from(trips)
    .leftJoin(vehicles, eq(vehicles.id, trips.vehicleId))
    .where(and(eq(trips.driverId, driverId), notInArray(trips.status, ["SETTLED", "CANCELLED"])))
    .orderBy(desc(trips.createdAt));
}

export async function getDriverTrip(driverId: string, tripId: string) {
  const [trip] = await db
    .select({ id: trips.id, tripNo: trips.tripNo, status: trips.status, plate: vehicles.plateNo, driverId: trips.driverId })
    .from(trips)
    .leftJoin(vehicles, eq(vehicles.id, trips.vehicleId))
    .where(eq(trips.id, tripId));
  if (!trip || trip.driverId !== driverId) return null;

  const stops = await db
    .select({
      id: tripStops.id, seq: tripStops.seq, type: orderStops.type, orderStopId: orderStops.id,
      location: locations.name, address: locations.address, orderNo: orders.orderNo, customer: customers.name,
    })
    .from(tripStops)
    .innerJoin(orderStops, eq(orderStops.id, tripStops.orderStopId))
    .innerJoin(orders, eq(orders.id, orderStops.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(locations, eq(locations.id, orderStops.locationId))
    .where(eq(tripStops.tripId, tripId))
    .orderBy(asc(tripStops.seq));
  const ids = stops.map((s) => s.orderStopId);
  const [cargo, podRows, expenses] = await Promise.all([
    ids.length ? db.select().from(cargoItems).where(inArray(cargoItems.orderStopId, ids)) : [],
    stops.length ? db.select().from(pods).where(inArray(pods.tripStopId, stops.map((s) => s.id))) : [],
    db.select().from(tripExpenses).where(eq(tripExpenses.tripId, tripId)).orderBy(desc(tripExpenses.createdAt)),
  ]);
  return {
    trip,
    stops: stops.map((s) => ({
      ...s,
      cargo: cargo.filter((c) => c.orderStopId === s.orderStopId),
      pod: podRows.find((p) => p.tripStopId === s.id) ?? null,
    })),
    expenses,
  };
}
