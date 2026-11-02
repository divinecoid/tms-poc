import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { can } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { getTrip } from "@/modules/dispatch/queries";
import { statusLabel } from "@/modules/dispatch/status";
import { rupiah } from "@/lib/money";
import { PodForm } from "@/modules/driver/pod-form";
import { AdvanceForm } from "@/modules/dispatch/advance-form";
import { ExpenseApproval } from "@/modules/dispatch/expense-approval";
import { TripActions } from "@/modules/dispatch/trip-actions";

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCan("read", "dispatch");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getTrip(id);
  if (!data) notFound();
  const { trip, stops, events, expenses } = data;
  const canApprove = can(user.role, "write", "expenses");
  const canDispatch = can(user.role, "write", "dispatch");
  const approved = expenses.filter((e) => e.status === "APPROVED").reduce((a, e) => a + Number(e.amount), 0);
  const advance = Number(trip.advanceAmount ?? 0);
  const diff = advance - approved;
  const own = trip.fulfillment === "OWN";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{trip.tripNo}</h1>
          <p className="text-muted-foreground text-sm">
            {own
              ? `${trip.plate} (${trip.vehicleType}) · ${trip.driver}${trip.driverPhone ? ` · ${trip.driverPhone}` : ""}`
              : `Vendor ${trip.vendor} · ${trip.vendorPlate} · ${trip.vendorDriverName ?? "driver —"}${trip.vendorDriverPhone ? ` · ${trip.vendorDriverPhone}` : ""}${trip.vendorCost ? ` · biaya Rp ${Number(trip.vendorCost).toLocaleString("id-ID")}` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={trip.status} />
          {can(user.role, "write", "dispatch") && (
            <TripActions id={trip.id} status={trip.status} canSettle={can(user.role, "write", "expenses")} />
          )}
        </div>
      </div>
      <Card>
        <CardHeader><CardTitle>Urutan stop</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {stops.map((s) => (
            <div key={s.seq} className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border p-3 text-sm">
              <div>
                <span className="font-medium">{s.seq}. {s.type === "PICKUP" ? "Pickup" : "Drop"}</span> — {s.location}
                <p className="text-muted-foreground">{s.address} · {s.orderNo} · {s.customer}</p>
              </div>
              <div className="text-right">
                {s.cargo.map((c) => (
                  <p key={c.id}>{c.description}{c.weightKg && ` · ${c.weightKg} kg`}{c.cbm && ` · ${c.cbm} CBM`}</p>
                ))}
                {s.pod && (
                  <div className="mt-1 space-y-1">
                    <p className="text-green-700">✓ POD: {s.pod.receiverName}</p>
                    <div className="flex justify-end gap-1">
                      {s.pod.signatureKey && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a href={`/api/v1/files/${s.pod.signatureKey}`} target="_blank"><img src={`/api/v1/files/${s.pod.signatureKey}`} alt="TTD" className="h-10 rounded border bg-white" /></a>
                      )}
                      {s.pod.photoKeys.map((k) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <a key={k} href={`/api/v1/files/${k}`} target="_blank"><img src={`/api/v1/files/${k}`} alt="Foto POD" className="h-10 rounded border" /></a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {!own && canDispatch && s.type === "DROP" && !s.pod && trip.status === "AT_DROP" && (
                <div className="w-full"><PodForm tripStopId={s.id} mode="vendor" /></div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Uang jalan & pengeluaran</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {own && (
            <div className="mb-3 space-y-2 rounded-md border p-3">
              <p>Uang jalan diberikan: <b>{rupiah(advance)}</b></p>
              {canApprove && trip.status !== "SETTLED" && <AdvanceForm tripId={trip.id} current={trip.advanceAmount} />}
              <p>Pengeluaran disetujui: <b>{rupiah(approved)}</b></p>
              <p>
                Selisih:{" "}
                <b className={diff < 0 ? "text-destructive" : ""}>
                  {diff >= 0 ? `driver mengembalikan ${rupiah(diff)}` : `perusahaan membayar ${rupiah(-diff)} ke driver`}
                </b>
              </p>
            </div>
          )}
          {expenses.length === 0 && <p className="text-muted-foreground">Belum ada pengeluaran.</p>}
          {expenses.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {e.category} · Rp {Number(e.amount).toLocaleString("id-ID")}
                {e.receiptKey && <> · <a className="underline" href={`/api/v1/files/${e.receiptKey}`} target="_blank">struk</a></>}
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge status={e.status} />
                {canApprove && e.status === "PENDING" && <ExpenseApproval id={e.id} />}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Riwayat status</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">
          {events.map((e) => (
            <p key={e.id}>
              <span className="text-muted-foreground">{e.at.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</span>{" "}
              — {statusLabel[e.status] ?? e.status}{e.note && ` (${e.note})`}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page(props: PageProps<"/dispatch/[id]">) {
  return <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}><Content params={props.params} /></Suspense>;
}
