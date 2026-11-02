import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { can } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { OrderStatusButtons } from "@/modules/orders/status-buttons";
import { getOrder } from "@/modules/orders/queries";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCan("read", "orders");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getOrder(id);
  if (!data) notFound();
  const { order, stops, trips } = data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{order.orderNo}</h1>
          <p className="text-muted-foreground text-sm">
            {order.customer} · {order.serviceType} · {order.requestedDate ?? "tanggal belum diisi"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={order.status} />
          {can(user.role, "write", "orders") && <OrderStatusButtons id={order.id} status={order.status} />}
        </div>
      </div>
      {order.notes && <p className="text-sm">Catatan: {order.notes}</p>}
      <Card>
        <CardHeader><CardTitle>Stop</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {stops.map((s) => (
            <div key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <span className="font-medium">#{s.seq} {s.type === "PICKUP" ? "Pickup" : "Drop"}</span> — {s.location}
                <p className="text-muted-foreground">{s.address}</p>
              </div>
              <div className="text-right">
                {s.cargo.length === 0 && <span className="text-muted-foreground">—</span>}
                {s.cargo.map((c) => (
                  <p key={c.id}>
                    {c.description}
                    {c.weightKg && ` · ${c.weightKg} kg`}
                    {c.cbm && ` · ${c.cbm} CBM`}
                    {c.pallets && ` · ${c.pallets} pallet`}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Trip</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {trips.length === 0 && <p className="text-muted-foreground">Belum di-dispatch.</p>}
          {trips.map((t) => (
            <p key={t.id} className="flex items-center gap-3">
              <Link className="font-medium underline" href={`/dispatch/${t.id}`}>{t.tripNo}</Link>
              <StatusBadge status={t.status} />
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page(props: PageProps<"/orders/[id]">) {
  return <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}><Content params={props.params} /></Suspense>;
}
