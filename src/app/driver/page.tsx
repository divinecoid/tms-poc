import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { requireDriver } from "@/lib/auth/session";
import { listDriverTrips } from "@/modules/driver/queries";
import { statusLabel } from "@/modules/dispatch/status";

async function Content() {
  const { driver } = await requireDriver();
  if (!driver) {
    return <p className="text-muted-foreground">Akun ini belum terhubung ke data driver. Hubungi admin.</p>;
  }
  const trips = await listDriverTrips(driver.id);
  return (
    <>
      <h1 className="text-xl font-semibold">Tugas saya</h1>
      {trips.length === 0 && <p className="text-muted-foreground">Belum ada tugas.</p>}
      {trips.map((t) => (
        <Link key={t.id} href={`/driver/trips/${t.id}`} className="block">
          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="font-medium">{t.tripNo}</p>
                <p className="text-muted-foreground text-sm">{t.plate} · {statusLabel[t.status]}</p>
              </div>
              <StatusBadge status={t.status} />
            </CardContent>
          </Card>
        </Link>
      ))}
    </>
  );
}

export default function Page() {
  return <Suspense fallback={<p className="text-muted-foreground">Memuat…</p>}><Content /></Suspense>;
}
