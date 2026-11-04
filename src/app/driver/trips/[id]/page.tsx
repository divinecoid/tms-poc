import { CheckCircle2, Package } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { requireDriver } from "@/lib/auth/session";
import { activeTripStatuses, nextStatus, statusLabel, trackingStatuses } from "@/modules/dispatch/status";
import { DriverAdvance } from "@/modules/driver/driver-advance";
import { ExpenseForm } from "@/modules/driver/expense-form";
import { GpsTracker } from "@/modules/driver/gps-tracker";
import { PodForm } from "@/modules/driver/pod-form";
import { getDriverTrip } from "@/modules/driver/queries";

const rp = (n: string) => `Rp ${Number(n).toLocaleString("id-ID")}`;

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { driver } = await requireDriver();
  if (!driver || !/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getDriverTrip(driver.id, id);
  if (!data) notFound();
  const { trip, stops, expenses } = data;
  const next = nextStatus(trip.status);
  const canAdvance = next && next !== "SETTLED";
  const tracking = (trackingStatuses as readonly string[]).includes(trip.status);
  const canExpense = (activeTripStatuses as readonly string[]).includes(trip.status) || trip.status === "DELIVERED";

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{trip.tripNo}</h1>
          <p className="text-muted-foreground text-sm">{trip.plate}</p>
        </div>
        <StatusBadge status={trip.status} />
      </div>
      <GpsTracker tripId={trip.id} active={tracking} />
      {canAdvance && <DriverAdvance tripId={trip.id} label={statusLabel[next]} />}

      <section className="space-y-3">
        <h2 className="font-semibold">Rute</h2>
        {stops.map((s) => (
          <div key={s.id} className="space-y-3 rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">{s.seq}. {s.type === "PICKUP" ? "Pickup" : "Drop"} — {s.location}</p>
              <p className="text-muted-foreground">{s.address}</p>
              <p className="text-muted-foreground">{s.orderNo} · {s.customer}</p>
              {s.cargo.map((c) => (
                <p key={c.id} className="flex items-center gap-1.5"><Package className="text-muted-foreground size-3.5" />{c.description}{c.weightKg && ` · ${Number(c.weightKg)} kg`}{c.cbm && ` · ${Number(c.cbm)} CBM`}</p>
              ))}
            </div>
            {s.type === "DROP" && s.pod && (
              <p className="flex items-center gap-1.5 text-green-700"><CheckCircle2 className="size-4" />POD diterima oleh {s.pod.receiverName}</p>
            )}
            {s.type === "DROP" && !s.pod && trip.status === "AT_DROP" && <PodForm tripStopId={s.id} />}
          </div>
        ))}
        {trip.status !== "AT_DROP" && stops.some((s) => s.type === "DROP" && !s.pod) && (
          <p className="text-muted-foreground text-xs">Form POD muncul setelah status “Di lokasi drop”.</p>
        )}
      </section>

      <Card>
        <CardHeader><CardTitle>Uang jalan & pengeluaran</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {canExpense && <ExpenseForm tripId={trip.id} />}
          {expenses.length === 0 && <p className="text-muted-foreground text-sm">Belum ada pengeluaran.</p>}
          {expenses.map((e) => (
            <div key={e.id} className="flex justify-between text-sm">
              <span>{e.category}</span>
              <span>{rp(e.amount)} · <span className="text-muted-foreground">{e.status}</span></span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

export default function Page(props: PageProps<"/driver/trips/[id]">) {
  return <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}><Content params={props.params} /></Suspense>;
}
