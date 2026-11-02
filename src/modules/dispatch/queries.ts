import { asc, desc, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/db";
import {
  cargoItems, customers, drivers, locations, orders, orderStops, pods, tripEvents, tripExpenses, tripStops, trips, vehicles, vendors,
} from "@/db/schema";
import { activeTripStatuses } from "./status";

export async function getDispatchData() {
  const confirmed = await db
    .select({ id: orders.id, orderNo: orders.orderNo, serviceType: orders.serviceType, customer: customers.name })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.status, "CONFIRMED"))
    .orderBy(asc(orders.createdAt));

  const stops = confirmed.length
    ? await db
        .select({ orderId: orderStops.orderId, type: orderStops.type, seq: orderStops.seq, location: locations.name, id: orderStops.id })
        .from(orderStops)
        .innerJoin(locations, eq(locations.id, orderStops.locationId))
        .where(inArray(orderStops.orderId, confirmed.map((o) => o.id)))
        .orderBy(asc(orderStops.seq))
    : [];
  const cargo = stops.length
    ? await db.select().from(cargoItems).where(inArray(cargoItems.orderStopId, stops.map((s) => s.id)))
    : [];

  const pending = confirmed.map((o) => {
    const os = stops.filter((s) => s.orderId === o.id);
    const pickupIds = new Set(os.filter((s) => s.type === "PICKUP").map((s) => s.id));
    const items = cargo.filter((c) => pickupIds.has(c.orderStopId));
    return {
      ...o,
      route: os.map((s) => s.location).join(" → "),
      kg: items.reduce((a, c) => a + Number(c.weightKg ?? 0), 0),
      cbm: items.reduce((a, c) => a + Number(c.cbm ?? 0), 0),
    };
  });

  const busy = await db
    .select({ vehicleId: trips.vehicleId, driverId: trips.driverId })
    .from(trips)
    .where(inArray(trips.status, [...activeTripStatuses]));
  const busyV = new Set(busy.map((b) => b.vehicleId));
  const busyD = new Set(busy.map((b) => b.driverId));

  const [vs, ds, vn] = await Promise.all([
    db.select().from(vehicles).orderBy(asc(vehicles.plateNo)),
    db.select().from(drivers).where(eq(drivers.status, "ACTIVE")).orderBy(asc(drivers.name)),
    db.select().from(vendors).where(eq(vendors.active, true)).orderBy(asc(vendors.name)),
  ]);

  return {
    pending,
    vehicles: vs.map((v) => ({
      id: v.id, label: `${v.plateNo} · ${v.type}${v.capacityKg ? ` · ${v.capacityKg} kg` : ""}`, busy: busyV.has(v.id),
    })),
    drivers: ds.map((d) => ({ id: d.id, label: d.name, busy: busyD.has(d.id) })),
    vendors: vn.map((v) => ({ id: v.id, label: v.name })),
  };
}

export async function listActiveTrips() {
  return db
    .select({
      id: trips.id, tripNo: trips.tripNo, status: trips.status, fulfillment: trips.fulfillment,
      plate: vehicles.plateNo, vendorPlate: trips.vendorPlate, vendor: vendors.name, driver: drivers.name,
    })
    .from(trips)
    .leftJoin(vehicles, eq(vehicles.id, trips.vehicleId))
    .leftJoin(drivers, eq(drivers.id, trips.driverId))
    .leftJoin(vendors, eq(vendors.id, trips.vendorId))
    .where(notInArray(trips.status, ["SETTLED", "CANCELLED"]))
    .orderBy(desc(trips.createdAt))
    .limit(100);
}

export async function getTrip(id: string) {
  const [trip] = await db
    .select({
      id: trips.id, tripNo: trips.tripNo, status: trips.status, fulfillment: trips.fulfillment,
      plate: vehicles.plateNo, vehicleType: vehicles.type, driver: drivers.name, driverPhone: drivers.phone,
      vendor: vendors.name, vendorPlate: trips.vendorPlate, vendorDriverName: trips.vendorDriverName,
      vendorDriverPhone: trips.vendorDriverPhone, vendorCost: trips.vendorCost, trackingToken: trips.trackingToken,
      actualStart: trips.actualStart, actualEnd: trips.actualEnd, advanceAmount: trips.advanceAmount,
    })
    .from(trips)
    .leftJoin(vehicles, eq(vehicles.id, trips.vehicleId))
    .leftJoin(drivers, eq(drivers.id, trips.driverId))
    .leftJoin(vendors, eq(vendors.id, trips.vendorId))
    .where(eq(trips.id, id));
  if (!trip) return null;

  const stops = await db
    .select({
      id: tripStops.id, seq: tripStops.seq, type: orderStops.type, location: locations.name, address: locations.address,
      orderNo: orders.orderNo, customer: customers.name, orderStopId: orderStops.id,
    })
    .from(tripStops)
    .innerJoin(orderStops, eq(orderStops.id, tripStops.orderStopId))
    .innerJoin(orders, eq(orders.id, orderStops.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .innerJoin(locations, eq(locations.id, orderStops.locationId))
    .where(eq(tripStops.tripId, id))
    .orderBy(asc(tripStops.seq));
  const cargo = stops.length
    ? await db.select().from(cargoItems).where(inArray(cargoItems.orderStopId, stops.map((s) => s.orderStopId)))
    : [];
  const events = await db.select().from(tripEvents).where(eq(tripEvents.tripId, id)).orderBy(desc(tripEvents.at));
  const podRows = stops.length
    ? await db.select().from(pods).where(inArray(pods.tripStopId, stops.map((s) => s.id)))
    : [];
  const expenses = await db.select().from(tripExpenses).where(eq(tripExpenses.tripId, id)).orderBy(desc(tripExpenses.createdAt));

  return {
    trip,
    stops: stops.map((s) => ({
      ...s,
      cargo: cargo.filter((c) => c.orderStopId === s.orderStopId),
      pod: podRows.find((p) => p.tripStopId === s.id) ?? null,
    })),
    events,
    expenses,
  };
}
