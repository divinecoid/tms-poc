import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { cargoItems, customers, locations, orders, orderStops, tripStops, trips } from "@/db/schema";

export async function listOrders() {
  const rows = await db
    .select({
      id: orders.id, orderNo: orders.orderNo, status: orders.status, serviceType: orders.serviceType,
      requestedDate: orders.requestedDate, customer: customers.name,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .orderBy(desc(orders.createdAt))
    .limit(200);
  if (rows.length === 0) return [];
  const stops = await db
    .select({ orderId: orderStops.orderId, type: orderStops.type })
    .from(orderStops)
    .where(inArray(orderStops.orderId, rows.map((r) => r.id)));
  return rows.map((r) => {
    const s = stops.filter((x) => x.orderId === r.id);
    return { ...r, pickups: s.filter((x) => x.type === "PICKUP").length, drops: s.filter((x) => x.type === "DROP").length };
  });
}

export async function getOrder(id: string) {
  const [order] = await db
    .select({
      id: orders.id, orderNo: orders.orderNo, status: orders.status, serviceType: orders.serviceType,
      requestedDate: orders.requestedDate, notes: orders.notes, customer: customers.name,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.id, id));
  if (!order) return null;

  const stops = await db
    .select({
      id: orderStops.id, seq: orderStops.seq, type: orderStops.type,
      location: locations.name, address: locations.address,
    })
    .from(orderStops)
    .innerJoin(locations, eq(locations.id, orderStops.locationId))
    .where(eq(orderStops.orderId, id))
    .orderBy(asc(orderStops.seq));
  const cargo = stops.length
    ? await db.select().from(cargoItems).where(inArray(cargoItems.orderStopId, stops.map((s) => s.id)))
    : [];
  const orderTrips = await db
    .selectDistinct({ id: trips.id, tripNo: trips.tripNo, status: trips.status })
    .from(tripStops)
    .innerJoin(trips, eq(trips.id, tripStops.tripId))
    .innerJoin(orderStops, eq(orderStops.id, tripStops.orderStopId))
    .where(eq(orderStops.orderId, id));

  return { order, stops: stops.map((s) => ({ ...s, cargo: cargo.filter((c) => c.orderStopId === s.id) })), trips: orderTrips };
}
