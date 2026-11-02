import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { can } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { listOrders } from "@/modules/orders/queries";

async function Content() {
  const user = await requireCan("read", "orders");
  const rows = await listOrders();
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Order</h1>
        {can(user.role, "write", "orders") && <Button render={<Link href="/orders/new" />}>+ Order baru</Button>}
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. order</TableHead><TableHead>Customer</TableHead><TableHead>Layanan</TableHead>
                <TableHead>Stop</TableHead><TableHead>Tanggal</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-muted-foreground text-center">Belum ada order</TableCell></TableRow>
              )}
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><Link className="font-medium underline" href={`/orders/${r.id}`}>{r.orderNo}</Link></TableCell>
                  <TableCell>{r.customer}</TableCell>
                  <TableCell>{r.serviceType}</TableCell>
                  <TableCell>{r.pickups} pickup · {r.drops} drop</TableCell>
                  <TableCell>{r.requestedDate ?? "—"}</TableCell>
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
