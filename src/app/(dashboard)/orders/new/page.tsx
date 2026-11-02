import { asc } from "drizzle-orm";
import { Suspense } from "react";
import { db } from "@/db";
import { customers, locations } from "@/db/schema";
import { requireCan } from "@/lib/auth/session";
import { OrderForm } from "@/modules/orders/order-form";

async function Content() {
  await requireCan("write", "orders");
  const [cs, ls] = await Promise.all([
    db.select({ id: customers.id, name: customers.name }).from(customers).orderBy(asc(customers.name)),
    db.select({ id: locations.id, name: locations.name }).from(locations).orderBy(asc(locations.name)),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Order baru</h1>
      {cs.length === 0 || ls.length === 0 ? (
        <p className="text-muted-foreground">Tambahkan minimal 1 customer dan 2 lokasi di Master data terlebih dahulu.</p>
      ) : (
        <OrderForm customers={cs} locations={ls} />
      )}
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}><Content /></Suspense>;
}
