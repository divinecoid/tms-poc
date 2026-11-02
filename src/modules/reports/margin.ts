import { and, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  cargoItems, customers, invoiceLines, invoices, orders, orderStops, tripExpenses, tripStops, trips,
} from "@/db/schema";
import { jakartaRange } from "@/lib/dates";
import { allocateCost, chargeableWeight } from "./allocate";

export type MarginRow = {
  orderId: string;
  orderNo: string;
  customerId: string;
  customer: string;
  tripNo: string;
  fulfillment: "OWN" | "VENDOR";
  tripStatus: string;
  costFinal: boolean;
  billed: boolean;
  revenue: number;
  cost: number;
  margin: number;
};

export type MarginReport = {
  rows: MarginRow[];
  byCustomer: { customerId: string; customer: string; orders: number; revenue: number; cost: number; margin: number }[];
  totals: { revenue: number; cost: number; margin: number; billedOrders: number; unbilledOrders: number; unbilledCost: number };
};

const num = (v: string | null | undefined) => Number(v ?? 0);

/**
 * Margin per order untuk trip yang terkirim pada rentang [from, to] (tanggal WIB).
 * Biaya trip: armada sendiri = pengeluaran yang disetujui; vendor = biaya vendor.
 * Biaya dialokasikan ke order dalam trip menurut berat tertagih. Order yang belum ditagih
 * ditampilkan tetapi tidak masuk total (agar margin tidak tampak negatif semu).
 */
export async function marginReport(from: string, to: string): Promise<MarginReport> {
  const { start, end } = jakartaRange(from, to);
  const tripRows = await db
    .select()
    .from(trips)
    .where(and(inArray(trips.status, ["DELIVERED", "SETTLED"]), gte(trips.actualEnd, start), lt(trips.actualEnd, end)));
  if (tripRows.length === 0) return { rows: [], byCustomer: [], totals: emptyTotals() };
  const tripIds = tripRows.map((t) => t.id);

  const [links, expenses] = await Promise.all([
    db
      .select({
        tripId: tripStops.tripId, orderId: orders.id, orderNo: orders.orderNo, customerId: customers.id,
        customer: customers.name, stopId: orderStops.id, stopType: orderStops.type,
      })
      .from(tripStops)
      .innerJoin(orderStops, eq(orderStops.id, tripStops.orderStopId))
      .innerJoin(orders, eq(orders.id, orderStops.orderId))
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(inArray(tripStops.tripId, tripIds)),
    db
      .select({ tripId: tripExpenses.tripId, amount: tripExpenses.amount })
      .from(tripExpenses)
      .where(and(inArray(tripExpenses.tripId, tripIds), eq(tripExpenses.status, "APPROVED"))),
  ]);

  const stopIds = links.filter((l) => l.stopType === "PICKUP").map((l) => l.stopId);
  const cargo = stopIds.length
    ? await db.select().from(cargoItems).where(inArray(cargoItems.orderStopId, stopIds))
    : [];
  const orderIds = [...new Set(links.map((l) => l.orderId))];
  const revenueRows = await db
    .select({ orderId: invoiceLines.orderId, amount: invoiceLines.amount })
    .from(invoiceLines)
    .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
    .where(and(inArray(invoiceLines.orderId, orderIds), ne(invoices.status, "VOID")));

  const rows: MarginRow[] = [];
  for (const trip of tripRows) {
    const tripLinks = links.filter((l) => l.tripId === trip.id);
    const orderMap = new Map<string, (typeof tripLinks)[number]>();
    for (const l of tripLinks) orderMap.set(l.orderId, l);

    const cost =
      trip.fulfillment === "VENDOR"
        ? num(trip.vendorCost)
        : expenses.filter((e) => e.tripId === trip.id).reduce((a, e) => a + num(e.amount), 0);

    const weights = [...orderMap.keys()].map((oid) => {
      const myStops = new Set(tripLinks.filter((l) => l.orderId === oid && l.stopType === "PICKUP").map((l) => l.stopId));
      const items = cargo.filter((c) => myStops.has(c.orderStopId));
      return {
        id: oid,
        weight: chargeableWeight(
          items.reduce((a, c) => a + num(c.weightKg), 0),
          items.reduce((a, c) => a + num(c.cbm), 0),
        ),
      };
    });
    const alloc = allocateCost(cost, weights);

    for (const [oid, l] of orderMap) {
      const rev = revenueRows.filter((r) => r.orderId === oid);
      const revenue = rev.reduce((a, r) => a + num(r.amount), 0);
      const c = alloc.get(oid) ?? 0;
      rows.push({
        orderId: oid, orderNo: l.orderNo, customerId: l.customerId, customer: l.customer,
        tripNo: trip.tripNo, fulfillment: trip.fulfillment, tripStatus: trip.status,
        costFinal: trip.status === "SETTLED", billed: rev.length > 0, revenue, cost: c, margin: revenue - c,
      });
    }
  }
  rows.sort((a, b) => a.orderNo.localeCompare(b.orderNo));

  const billed = rows.filter((r) => r.billed);
  const byCustomerMap = new Map<string, MarginReport["byCustomer"][number]>();
  for (const r of billed) {
    const cur = byCustomerMap.get(r.customerId) ?? {
      customerId: r.customerId, customer: r.customer, orders: 0, revenue: 0, cost: 0, margin: 0,
    };
    cur.orders += 1;
    cur.revenue += r.revenue;
    cur.cost += r.cost;
    cur.margin += r.margin;
    byCustomerMap.set(r.customerId, cur);
  }
  const unbilled = rows.filter((r) => !r.billed);
  return {
    rows,
    byCustomer: [...byCustomerMap.values()].sort((a, b) => b.margin - a.margin),
    totals: {
      revenue: billed.reduce((a, r) => a + r.revenue, 0),
      cost: billed.reduce((a, r) => a + r.cost, 0),
      margin: billed.reduce((a, r) => a + r.margin, 0),
      billedOrders: billed.length,
      unbilledOrders: unbilled.length,
      unbilledCost: unbilled.reduce((a, r) => a + r.cost, 0),
    },
  };
}

function emptyTotals(): MarginReport["totals"] {
  return { revenue: 0, cost: 0, margin: 0, billedOrders: 0, unbilledOrders: 0, unbilledCost: 0 };
}

export const marginPct = (margin: number, revenue: number) => (revenue > 0 ? (margin / revenue) * 100 : 0);
