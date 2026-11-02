import { and, count, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { invoices, orders, trips, vehicles, vendorBills } from "@/db/schema";
import { addDaysIso, daysBetween, jakartaRange, monthStartJakarta, todayJakarta } from "@/lib/dates";
import { activeTripStatuses } from "@/modules/dispatch/status";
import { marginReport } from "./margin";

const jkt = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

/** Jumlah hari-armada yang terpakai: gabungan tanggal unik per kendaraan dalam [from, to]. */
export function countActiveDays(spans: { key: string; start: string; end: string }[], from: string, to: string) {
  const seen = new Set<string>();
  for (const s of spans) {
    let d = s.start < from ? from : s.start;
    const last = s.end > to ? to : s.end;
    while (d <= last) {
      seen.add(`${s.key}|${d}`);
      d = addDaysIso(d, 1);
    }
  }
  return seen.size;
}

export async function operationalKpi() {
  const from = monthStartJakarta();
  const today = todayJakarta();
  const { start, end } = jakartaRange(from, today);

  const [[active], [waiting], [delivered], [fleet]] = await Promise.all([
    db.select({ n: count() }).from(trips).where(inArray(trips.status, [...activeTripStatuses])),
    db.select({ n: count() }).from(orders).where(eq(orders.status, "CONFIRMED")),
    db.select({ n: count() }).from(trips).where(and(gte(trips.actualEnd, start), sql`${trips.actualEnd} < ${end}`)),
    db.select({ n: count() }).from(vehicles),
  ]);

  const own = await db
    .select({ vehicleId: trips.vehicleId, actualStart: trips.actualStart, actualEnd: trips.actualEnd })
    .from(trips)
    .where(and(eq(trips.fulfillment, "OWN"), isNotNull(trips.vehicleId), isNotNull(trips.actualStart), ne(trips.status, "CANCELLED")));
  const spans = own.map((t) => ({
    key: t.vehicleId!, start: jkt(t.actualStart!), end: t.actualEnd ? jkt(t.actualEnd) : today,
  }));
  const daysElapsed = daysBetween(from, today) + 1;
  const capacity = fleet.n * daysElapsed;
  const utilization = capacity > 0 ? (countActiveDays(spans, from, today) / capacity) * 100 : null;

  return { activeTrips: active.n, waitingOrders: waiting.n, deliveredMonth: delivered.n, fleet: fleet.n, utilization };
}

export async function financialKpi() {
  const from = monthStartJakarta();
  const today = todayJakarta();
  const since = addDaysIso(today, -90);

  const [month, ar, ap, paid, margin] = await Promise.all([
    db.select({ subtotal: invoices.subtotal }).from(invoices).where(and(gte(invoices.issuedAt, from), ne(invoices.status, "VOID"))),
    db.select({ total: invoices.total, dueAt: invoices.dueAt }).from(invoices).where(eq(invoices.status, "ISSUED")),
    db.select({ amount: vendorBills.amount, dueAt: vendorBills.dueAt }).from(vendorBills).where(ne(vendorBills.status, "PAID")),
    db
      .select({ issuedAt: invoices.issuedAt, paidAt: invoices.paidAt })
      .from(invoices)
      .where(and(eq(invoices.status, "PAID"), gte(invoices.paidAt, since))),
    marginReport(from, today),
  ]);

  const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((a, r) => a + f(r), 0);
  const dso = paid.length
    ? sum(paid, (p) => daysBetween(p.issuedAt, p.paidAt!)) / paid.length
    : null;
  return {
    revenueMonth: sum(month, (r) => Number(r.subtotal)),
    margin: margin.totals.margin,
    marginRevenue: margin.totals.revenue,
    unbilledOrders: margin.totals.unbilledOrders,
    receivable: sum(ar, (r) => Number(r.total)),
    receivableOverdue: sum(ar.filter((r) => r.dueAt < today), (r) => Number(r.total)),
    payable: sum(ap, (r) => Number(r.amount)),
    payableOverdue: sum(ap.filter((r) => r.dueAt < today), (r) => Number(r.amount)),
    dso,
  };
}
