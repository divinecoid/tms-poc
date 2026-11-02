import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { can } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { todayJakarta } from "@/lib/dates";
import { rupiah } from "@/lib/money";
import { listInvoices } from "@/modules/invoices/queries";

async function Content() {
  const user = await requireCan("read", "invoices");
  const rows = await listInvoices();
  const today = todayJakarta();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoice</h1>
        {can(user.role, "write", "invoices") && <Button render={<Link href="/invoices/new" />}>+ Invoice baru</Button>}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. invoice</TableHead><TableHead>Customer</TableHead><TableHead>Tanggal</TableHead>
                <TableHead>Jatuh tempo</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-muted-foreground text-center">Belum ada invoice</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Link className="font-medium underline" href={`/invoices/${r.id}`}>{r.invoiceNo}</Link></TableCell>
                  <TableCell>{r.customer}</TableCell>
                  <TableCell>{r.issuedAt}</TableCell>
                  <TableCell className={r.status === "ISSUED" && r.dueAt < today ? "text-destructive font-medium" : ""}>
                    {r.dueAt}{r.status === "ISSUED" && r.dueAt < today && " (lewat)"}
                  </TableCell>
                  <TableCell className="text-right">{rupiah(r.total)}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
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
