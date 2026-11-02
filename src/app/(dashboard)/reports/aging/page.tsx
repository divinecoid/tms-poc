import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireCan } from "@/lib/auth/session";
import { rupiah } from "@/lib/money";
import { agingReport, buckets, sumColumns, type AgingRow } from "@/modules/reports/aging";

function AgingTable({ title, partyLabel, rows }: { title: string; partyLabel: string; rows: AgingRow[] }) {
  const cols = sumColumns(rows);
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{partyLabel}</TableHead>
              {buckets.map((b) => <TableHead key={b} className="text-right">{b}</TableHead>)}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={buckets.length + 2} className="text-muted-foreground text-center">Tidak ada outstanding</TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.partyId}>
                <TableCell className="font-medium">{r.party} <span className="text-muted-foreground">({r.count})</span></TableCell>
                {r.amounts.map((a, i) => (
                  <TableCell key={i} className={`text-right ${i >= 3 && a > 0 ? "text-destructive font-medium" : ""}`}>{a ? rupiah(a) : "—"}</TableCell>
                ))}
                <TableCell className="text-right font-semibold">{rupiah(r.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                {cols.map((c, i) => <TableCell key={i} className="text-right">{rupiah(c)}</TableCell>)}
                <TableCell className="text-right">{rupiah(cols.reduce((a, b) => a + b, 0))}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </CardContent>
    </Card>
  );
}

async function Content() {
  await requireCan("read", "reports");
  const r = await agingReport();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Aging piutang & hutang</h1>
        <p className="text-muted-foreground text-sm">Per {r.today} (WIB), dihitung dari tanggal jatuh tempo. Angka dalam kurung = jumlah dokumen.</p>
      </div>
      <AgingTable title="Piutang customer (invoice belum lunas)" partyLabel="Customer" rows={r.receivable} />
      <AgingTable title="Hutang vendor (tagihan belum dibayar)" partyLabel="Vendor" rows={r.payable} />
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}><Content /></Suspense>;
}
