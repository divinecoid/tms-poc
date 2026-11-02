"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { cargoItems, orders, orderStops } from "@/db/schema";
import { requireCan } from "@/lib/auth/session";
import { nextDocNo } from "@/lib/doc-number";
import { orderInput } from "./schema";

export type CreateOrderResult = { error?: string; id?: string };

export async function createOrder(raw: unknown): Promise<CreateOrderResult> {
  await requireCan("write", "orders");
  const parsed = orderInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const v = parsed.data;

  const id = await db.transaction(async (tx) => {
    const orderNo = await nextDocNo(tx, "ORD");
    const [order] = await tx
      .insert(orders)
      .values({
        orderNo,
        customerId: v.customerId,
        serviceType: v.serviceType,
        requestedDate: v.requestedDate ?? null,
        notes: v.notes || null,
      })
      .returning({ id: orders.id });

    for (const [i, s] of v.stops.entries()) {
      const [stop] = await tx
        .insert(orderStops)
        .values({ orderId: order.id, seq: i + 1, type: s.type, locationId: s.locationId })
        .returning({ id: orderStops.id });
      if (s.cargo) {
        await tx.insert(cargoItems).values({
          orderStopId: stop.id,
          description: s.cargo,
          weightKg: s.weightKg ?? null,
          cbm: s.cbm ?? null,
          pallets: s.pallets ? Number(s.pallets) : null,
        });
      }
    }
    return order.id;
  });

  revalidatePath("/orders");
  return { id };
}

const allowed: Record<string, string[]> = {
  CONFIRMED: ["DRAFT"],
  CANCELLED: ["DRAFT", "CONFIRMED"],
};

export async function setOrderStatus(id: string, status: "CONFIRMED" | "CANCELLED") {
  await requireCan("write", "orders");
  const [o] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, id));
  if (!o || !allowed[status].includes(o.status)) return;
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/dispatch");
}
