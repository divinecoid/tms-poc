import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { can } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { todayJakarta } from "@/lib/dates";
import { rupiah } from "@/lib/money";
import { BillActions, CreateBillButton } from "@/modules/payables/bill-actions";
import { listBillableTrips, listBills } from "@/modules/payables/queries";

async function Content() {
  const user = await requireCan("read", "payables");
  const writable = can(user.role, "write", "payables");
  const [bills, billable] = await Promise.all([listBills(), listBillableTrips()]);
  const today = todayJakarta();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Hutang vendor</h1>
      <Card>
        <CardHeader><CardTitle>Trip vendor siap ditagih ({billable.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {billable.length === 0 && <p className="text-muted-foreground">Tidak ada. Trip vendor muncul di sini setelah terkirim (e-POD lengkap).</p>}
          {billable.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <span>
                <Link className="font-medium underline" href={`/dispatch/${t.id}`}>{t.tripNo}</Link> · {t.vendor} · {t.plate}
              </span>
              <span className="flex items-center gap-3">
                {t.cost ? rupiah(t.cost) : <span className="text-destructive">biaya belum diisi</span>}
                {writable && t.cost && <CreateBillButton tripId={t.id} />}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. tagihan</TableHead><TableHead>Vendor</TableHead><TableHead>Trip</TableHead>
                <TableHead>Jatuh tempo</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead>Status</TableHead>
                {writable && <TableHead className="w-36" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-muted-foreground text-center">Belum ada tagihan</TableCell></TableRow>
              )}
              {bills.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.billNo}</TableCell>
                  <TableCell>{b.vendor}</TableCell>
                  <TableCell>{b.tripId ? <Link className="underline" href={`/dispatch/${b.tripId}`}>{b.tripNo}</Link> : "—"}</TableCell>
                  <TableCell className={b.status !== "PAID" && b.dueAt < today ? "text-destructive font-medium" : ""}>{b.dueAt}</TableCell>
                  <TableCell className="text-right">{rupiah(b.amount)}</TableCell>
                  <TableCell><StatusBadge status={b.status} /></TableCell>
                  {writable && <TableCell><BillActions id={b.id} status={b.status} /></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}><Content /></Suspense>;
}
