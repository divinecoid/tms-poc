import { Suspense } from "react";
import { requireCan } from "@/lib/auth/session";
import { demoFleet } from "@/modules/tracking/demo-fleet";
import { FleetMapLoader } from "@/modules/tracking/fleet-map-loader";

async function Content() {
  await requireCan("read", "dispatch");
  return <FleetMapLoader initial={demoFleet()} />;
}

export default function Page() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tracking armada</h1>
        <p className="text-muted-foreground text-sm">Posisi truk secara langsung di atas peta OpenStreetMap. Klik unit untuk melihat detail dan rutenya.</p>
      </div>
      <div className="min-h-0 flex-1">
        <Suspense fallback={<div className="bg-muted/40 h-full min-h-[560px] animate-pulse rounded-xl border" />}>
          <Content />
        </Suspense>
      </div>
    </div>
  );
}
