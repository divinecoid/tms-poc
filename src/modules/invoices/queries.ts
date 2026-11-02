import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoiceLines, invoices, locations, orders, orderStops } from "@/db/schema";

export async function listInvoices() {
  return db
    .select({
      id: invoices.id, invoiceNo: invoices.invoiceNo, status: invoices.status, issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt, total: invoices.total, customer: customers.name,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .orderBy(desc(invoices.createdAt))
    .limit(200);
}

export async function getInvoice(id: string) {
  const [invoice] = await db
    .select({
      id: invoices.id, invoiceNo: invoices.invoiceNo, status: invoices.status, issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt, paidAt: invoices.paidAt, subtotal: invoices.subtotal, ppn: invoices.ppn,
      pph23: invoices.pph23, total: invoices.total, customer: customers.name, npwp: customers.npwp,
    })
    .from(invoices)
    .innerJoin(customers, eq(customers.id, invoices.customerId))
    .where(eq(invoices.id, id));
  if (!invoice) return null;
  const lines = await db.select().from(invoiceLines).where(eq(invoiceLines.invoiceId, id));
  return { invoice, lines };
}

/** Order DELIVERED yang belum ditagih, dikelompokkan per customer di sisi klien. */
export async function listBillableOrders() {
  const rows = await db
    .select({
      id: orders.id, orderNo: orders.orderNo, customerId: orders.customerId, customer: customers.name,
      priceTotal: orders.priceTotal,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(orders.status, "DELIVERED"))
    .orderBy(asc(customers.name), asc(orders.createdAt));
  if (!rows.length) return [];
  const stops = await db
    .select({ orderId: orderStops.orderId, seq: orderStops.seq, name: locations.name })
    .from(orderStops)
    .innerJoin(locations, eq(locations.id, orderStops.locationId))
    .where(inArray(orderStops.orderId, rows.map((r) => r.id)));
  return rows.map((r) => ({
    ...r,
    route: stops.filter((s) => s.orderId === r.id).sort((a, b) => a.seq - b.seq).map((s) => s.name).join(" → "),
  }));
}
