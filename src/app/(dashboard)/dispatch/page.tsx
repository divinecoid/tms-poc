import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { can } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { CreateTripForm } from "@/modules/dispatch/create-trip-form";
import { getDispatchData, listActiveTrips } from "@/modules/dispatch/queries";

async function Content() {
  const user = await requireCan("read", "dispatch");
  const [data, active] = await Promise.all([getDispatchData(), listActiveTrips()]);
  const writable = can(user.role, "write", "dispatch");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dispatch</h1>
      {writable && (
        <Card>
          <CardHeader><CardTitle>Order siap dispatch ({data.pending.length})</CardTitle></CardHeader>
          <CardContent>
            <CreateTripForm pending={data.pending} vehicles={data.vehicles} drivers={data.drivers} vendors={data.vendors} />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Trip aktif</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Trip</TableHead><TableHead>Armada</TableHead><TableHead>Driver</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {active.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-muted-foreground text-center">Belum ada trip</TableCell></TableRow>
              )}
              {active.map((t) => (
                <TableRow key={t.id}>
                  <TableCell><Link className="font-medium underline" href={`/dispatch/${t.id}`}>{t.tripNo}</Link></TableCell>
                  <TableCell>{t.fulfillment === "OWN" ? t.plate : `${t.vendorPlate} (${t.vendor})`}</TableCell>
                  <TableCell>{t.driver ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
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
