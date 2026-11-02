import { eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { customers, invoices, vendorBills, vendors } from "@/db/schema";
import { daysBetween, todayJakarta } from "@/lib/dates";

export const buckets = ["Belum jatuh tempo", "1–30 hari", "31–60 hari", "61–90 hari", "> 90 hari"] as const;

export function bucketIndex(daysOverdue: number) {
  if (daysOverdue <= 0) return 0;
  if (daysOverdue <= 30) return 1;
  if (daysOverdue <= 60) return 2;
  if (daysOverdue <= 90) return 3;
  return 4;
}

export type AgingRow = { partyId: string; party: string; amounts: number[]; total: number; count: number };

function group(items: { partyId: string; party: string; amount: number; dueAt: string }[], today: string): AgingRow[] {
  const map = new Map<string, AgingRow>();
  for (const it of items) {
    const row = map.get(it.partyId) ?? { partyId: it.partyId, party: it.party, amounts: [0, 0, 0, 0, 0], total: 0, count: 0 };
    row.amounts[bucketIndex(daysBetween(it.dueAt, today))] += it.amount;
    row.total += it.amount;
    row.count += 1;
    map.set(it.partyId, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export async function agingReport() {
  const today = todayJakarta();
  const [ar, ap] = await Promise.all([
    db
      .select({ partyId: customers.id, party: customers.name, amount: invoices.total, dueAt: invoices.dueAt })
      .from(invoices)
      .innerJoin(customers, eq(customers.id, invoices.customerId))
      .where(eq(invoices.status, "ISSUED")),
    db
      .select({ partyId: vendors.id, party: vendors.name, amount: vendorBills.amount, dueAt: vendorBills.dueAt })
      .from(vendorBills)
      .innerJoin(vendors, eq(vendors.id, vendorBills.vendorId))
      .where(ne(vendorBills.status, "PAID")),
  ]);
  return {
    today,
    receivable: group(ar.map((r) => ({ ...r, amount: Number(r.amount) })), today),
    payable: group(ap.map((r) => ({ ...r, amount: Number(r.amount) })), today),
  };
}

export const sumColumns = (rows: AgingRow[]) =>
  buckets.map((_, i) => rows.reduce((a, r) => a + r.amounts[i], 0));
