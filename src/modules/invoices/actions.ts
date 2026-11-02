"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { customers, invoiceLines, invoices, locations, orders, orderStops } from "@/db/schema";
import { requireCan } from "@/lib/auth/session";
import { addDaysIso, todayJakarta } from "@/lib/dates";
import { nextDocNo } from "@/lib/doc-number";
import { invoiceTotals } from "@/lib/tax";

type Result = { error?: string; id?: string };
class UserError extends Error {}

const input = z.object({
  customerId: z.uuid("Pilih customer"),
  issuedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  ppn: z.boolean(),
  pph23: z.boolean(),
  lines: z
    .array(z.object({
      orderId: z.uuid(),
      amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Nominal harus angka").refine((a) => Number(a) > 0, "Nominal harus > 0"),
    }))
    .min(1, "Pilih minimal 1 order"),
});

export async function createInvoice(raw: unknown): Promise<Result> {
  await requireCan("write", "invoices");
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const v = parsed.data;
  if (new Set(v.lines.map((l) => l.orderId)).size !== v.lines.length) return { error: "Order duplikat" };

  try {
    const id = await db.transaction(async (tx) => {
      const [customer] = await tx.select().from(customers).where(eq(customers.id, v.customerId));
      if (!customer) throw new UserError("Customer tidak ditemukan");

      const rows = await tx
        .select({ id: orders.id, orderNo: orders.orderNo, status: orders.status, customerId: orders.customerId })
        .from(orders)
        .where(inArray(orders.id, v.lines.map((l) => l.orderId)))
        .for("update");
      if (rows.length !== v.lines.length) throw new UserError("Order tidak ditemukan");
      const bad = rows.find((o) => o.status !== "DELIVERED" || o.customerId !== v.customerId);
      if (bad) throw new UserError(`Order ${bad.orderNo} tidak bisa ditagih (harus DELIVERED dan milik customer ini)`);

      const stops = await tx
        .select({ orderId: orderStops.orderId, seq: orderStops.seq, name: locations.name })
        .from(orderStops)
        .innerJoin(locations, eq(locations.id, orderStops.locationId))
        .where(inArray(orderStops.orderId, rows.map((r) => r.id)));
      const route = (oid: string) =>
        stops.filter((s) => s.orderId === oid).sort((a, b) => a.seq - b.seq).map((s) => s.name).join(" → ");

      const subtotal = v.lines.reduce((a, l) => a + Number(l.amount), 0);
      const t = invoiceTotals(subtotal, { ppn: v.ppn, pph23: v.pph23 });
      const invoiceNo = await nextDocNo(tx, "INV");
      const [inv] = await tx
        .insert(invoices)
        .values({
          invoiceNo, customerId: v.customerId, issuedAt: v.issuedAt,
          dueAt: addDaysIso(v.issuedAt, customer.paymentTermDays),
          subtotal: String(t.subtotal), ppn: String(t.ppn), pph23: String(t.pph23), total: String(t.total),
        })
        .returning({ id: invoices.id });

      await tx.insert(invoiceLines).values(
        v.lines.map((l) => {
          const o = rows.find((r) => r.id === l.orderId)!;
          return {
            invoiceId: inv.id, orderId: o.id,
            description: `Jasa pengiriman ${o.orderNo} (${route(o.id)})`,
            qty: "1", unitPrice: l.amount, amount: l.amount,
          };
        }),
      );
      for (const l of v.lines) {
        await tx.update(orders).set({ status: "INVOICED", priceTotal: l.amount, updatedAt: new Date() }).where(eq(orders.id, l.orderId));
      }
      return inv.id;
    });
    revalidatePath("/invoices");
    revalidatePath("/orders");
    return { id };
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
}

async function orderIdsOf(invoiceId: string) {
  const rows = await db.select({ id: invoiceLines.orderId }).from(invoiceLines).where(eq(invoiceLines.invoiceId, invoiceId));
  return rows.map((r) => r.id).filter((x): x is string => !!x);
}

export async function markInvoicePaid(id: string): Promise<{ error?: string }> {
  await requireCan("write", "invoices");
  const ok = await db.transaction(async (tx) => {
    const [inv] = await tx
      .update(invoices)
      .set({ status: "PAID", paidAt: todayJakarta(), updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.status, "ISSUED")))
      .returning({ id: invoices.id });
    if (!inv) return false;
    const ids = await orderIdsOf(id);
    if (ids.length) await tx.update(orders).set({ status: "PAID", updatedAt: new Date() }).where(inArray(orders.id, ids));
    return true;
  });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/orders");
  return ok ? {} : { error: "Invoice tidak bisa ditandai lunas" };
}

export async function voidInvoice(id: string): Promise<{ error?: string }> {
  await requireCan("write", "invoices");
  const ok = await db.transaction(async (tx) => {
    const [inv] = await tx
      .update(invoices)
      .set({ status: "VOID", updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.status, "ISSUED")))
      .returning({ id: invoices.id });
    if (!inv) return false;
    const ids = await orderIdsOf(id);
    if (ids.length) await tx.update(orders).set({ status: "DELIVERED", updatedAt: new Date() }).where(inArray(orders.id, ids));
    return true;
  });
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
  revalidatePath("/orders");
  return ok ? {} : { error: "Hanya invoice berstatus ISSUED yang bisa di-void" };
}
