import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { rupiah } from "@/lib/money";
import { financialKpi, operationalKpi } from "@/modules/reports/kpi";

function Kpi({ label, value, hint, bad }: { label: string; value: string; hint?: string; bad?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle></CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold ${bad ? "text-destructive" : ""}`}>{value}</p>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  );
}

async function Content() {
  const user = await requireUser();
  const ops = await operationalKpi();
  const fin = can(user.role, "read", "reports") ? await financialKpi() : null;
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Operasional <span className="text-muted-foreground text-sm font-normal">· bulan berjalan</span></h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Trip aktif" value={String(ops.activeTrips)} />
          <Kpi label="Order menunggu dispatch" value={String(ops.waitingOrders)} />
          <Kpi label="Trip terkirim bulan ini" value={String(ops.deliveredMonth)} />
          <Kpi
            label="Utilisasi armada sendiri"
            value={ops.utilization == null ? "—" : `${ops.utilization.toFixed(0)}%`}
            hint={ops.fleet ? `${ops.fleet} kendaraan · hari ada trip ÷ hari kalender` : "belum ada kendaraan"}
          />
        </div>
      </section>

      {fin && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Keuangan</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Pendapatan bulan ini" value={rupiah(fin.revenueMonth)} hint="invoice terbit, sebelum pajak" />
            <Kpi
              label="Margin trip terkirim"
              value={rupiah(fin.margin)}
              bad={fin.margin < 0}
              hint={fin.marginRevenue > 0 ? `${((fin.margin / fin.marginRevenue) * 100).toFixed(1)}% dari pendapatan` : "belum ada order tertagih"}
            />
            <Kpi
              label="Piutang beredar"
              value={rupiah(fin.receivable)}
              bad={fin.receivableOverdue > 0}
              hint={fin.receivableOverdue > 0 ? `${rupiah(fin.receivableOverdue)} lewat jatuh tempo` : "tidak ada yang lewat jatuh tempo"}
            />
            <Kpi
              label="Hutang vendor"
              value={rupiah(fin.payable)}
              bad={fin.payableOverdue > 0}
              hint={fin.payableOverdue > 0 ? `${rupiah(fin.payableOverdue)} lewat jatuh tempo` : "tidak ada yang lewat jatuh tempo"}
            />
            <Kpi
              label="DSO (90 hari terakhir)"
              value={fin.dso == null ? "—" : `${fin.dso.toFixed(0)} hari`}
              hint="rata-rata invoice terbit → dibayar"
            />
            {fin.unbilledOrders > 0 && (
              <Kpi label="Belum ditagih" value={`${fin.unbilledOrders} order`} bad hint="terkirim bulan ini, belum ada invoice" />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}>
        <Content />
      </Suspense>
    </div>
  );
}
