import { Suspense } from "react";
import { can } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { getFleetSnapshot } from "@/modules/tracking/fleet-snapshot";
import { FleetMapLoader } from "@/modules/tracking/fleet-map-loader";

async function Content({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const user = await requireCan("read", "dispatch");
  const { focus } = await searchParams;
  return <FleetMapLoader initial={getFleetSnapshot(new Date(), can(user.role, "read", "fuel"))} focusId={focus} />;
}

export default function Page(props: PageProps<"/tracking">) {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tracking armada</h1>
        <p className="text-muted-foreground text-sm">Posisi truk secara langsung di atas peta OpenStreetMap. Klik unit untuk melihat detail dan rutenya.</p>
      </div>
      <div className="min-h-0 flex-1">
        <Suspense fallback={<div className="bg-muted/40 h-full min-h-[560px] animate-pulse rounded-xl border" />}>
          <Content searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
