import Link from "next/link";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireCan } from "@/lib/auth/session";
import { isIsoDate, monthStartJakarta, todayJakarta } from "@/lib/dates";
import { rupiah } from "@/lib/money";
import { marginPct, marginReport } from "@/modules/reports/margin";

type SP = Promise<{ from?: string; to?: string }>;

const pct = (m: number, r: number) => `${marginPct(m, r).toFixed(1)}%`;
const tone = (n: number) => (n < 0 ? "text-destructive font-medium" : "");

async function Content({ searchParams }: { searchParams: SP }) {
  await requireCan("read", "reports");
  const sp = await searchParams;
  const from = isIsoDate(sp.from) ? sp.from : monthStartJakarta();
  const to = isIsoDate(sp.to) ? sp.to : todayJakarta();
  const invalid = from > to;
  const report = invalid ? null : await marginReport(from, to);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Laporan margin</h1>
        <form className="flex flex-wrap items-end gap-2" method="get">
          <div className="space-y-1"><label className="text-muted-foreground text-xs">Dari</label><Input type="date" name="from" defaultValue={from} /></div>
          <div className="space-y-1"><label className="text-muted-foreground text-xs">Sampai</label><Input type="date" name="to" defaultValue={to} /></div>
          <Button type="submit">Terapkan</Button>
          {!invalid && <Button variant="outline" render={<a href={`/api/v1/reports/margin?from=${from}&to=${to}`} />}>Unduh CSV</Button>}
        </form>
      </div>
      <p className="text-muted-foreground text-sm">
        Berdasarkan trip yang terkirim pada rentang ini (tanggal WIB). Pendapatan = nilai invoice sebelum pajak. Biaya =
        pengeluaran yang disetujui (armada sendiri) atau biaya vendor, dibagi ke order menurut berat tertagih.
      </p>
      {!report ? (
        <p className="text-destructive text-sm">Tanggal “Dari” tidak boleh setelah “Sampai”.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Pendapatan", rupiah(report.totals.revenue)],
              ["Biaya", rupiah(report.totals.cost)],
              ["Margin", rupiah(report.totals.margin)],
              ["Margin %", pct(report.totals.margin, report.totals.revenue)],
            ].map(([k, v]) => (
              <Card key={k}>
                <CardHeader><CardTitle className="text-muted-foreground text-sm font-medium">{k}</CardTitle></CardHeader>
                <CardContent className={`text-2xl font-semibold ${k.startsWith("Margin") && report.totals.margin < 0 ? "text-destructive" : ""}`}>{v}</CardContent>
              </Card>
            ))}
          </div>
          {report.totals.unbilledOrders > 0 && (
            <p className="rounded-md border p-3 text-sm">
              {report.totals.unbilledOrders} order terkirim belum ditagih (biaya {rupiah(report.totals.unbilledCost)}) dan belum
              dihitung di total. Terbitkan invoice-nya agar masuk laporan.
            </p>
          )}

          <Card>
            <CardHeader><CardTitle>Per customer</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead><TableHead className="text-right">Order</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead><TableHead className="text-right">Biaya</TableHead>
                    <TableHead className="text-right">Margin</TableHead><TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byCustomer.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-muted-foreground text-center">Tidak ada data pada rentang ini</TableCell></TableRow>
                  )}
                  {report.byCustomer.map((c) => (
                    <TableRow key={c.customerId}>
                      <TableCell className="font-medium">{c.customer}</TableCell>
                      <TableCell className="text-right">{c.orders}</TableCell>
                      <TableCell className="text-right">{rupiah(c.revenue)}</TableCell>
                      <TableCell className="text-right">{rupiah(c.cost)}</TableCell>
                      <TableCell className={`text-right ${tone(c.margin)}`}>{rupiah(c.margin)}</TableCell>
                      <TableCell className={`text-right ${tone(c.margin)}`}>{pct(c.margin, c.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Per order</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Trip</TableHead>
                    <TableHead className="text-right">Pendapatan</TableHead><TableHead className="text-right">Biaya</TableHead>
                    <TableHead className="text-right">Margin</TableHead><TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.rows.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-muted-foreground text-center">Tidak ada data pada rentang ini</TableCell></TableRow>
                  )}
                  {report.rows.map((r) => (
                    <TableRow key={r.orderId}>
                      <TableCell><Link className="underline" href={`/orders/${r.orderId}`}>{r.orderNo}</Link></TableCell>
                      <TableCell>{r.customer}</TableCell>
                      <TableCell>
                        {r.tripNo} <span className="text-muted-foreground">({r.fulfillment === "OWN" ? "sendiri" : "vendor"})</span>
                        {!r.costFinal && <Badge variant="outline" className="ml-1">biaya estimasi</Badge>}
                      </TableCell>
                      <TableCell className="text-right">{r.billed ? rupiah(r.revenue) : <span className="text-muted-foreground">belum ditagih</span>}</TableCell>
                      <TableCell className="text-right">{rupiah(r.cost)}</TableCell>
                      <TableCell className={`text-right ${r.billed ? tone(r.margin) : ""}`}>{r.billed ? rupiah(r.margin) : "—"}</TableCell>
                      <TableCell className={`text-right ${r.billed ? tone(r.margin) : ""}`}>{r.billed ? pct(r.margin, r.revenue) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default function Page(props: PageProps<"/reports/margin">) {
  return <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}><Content searchParams={props.searchParams} /></Suspense>;
}
