"use client";

import dynamic from "next/dynamic";
import type { FleetSnapshot } from "./demo-fleet";

// Leaflet butuh `window`, jadi hanya dimuat di browser.
const FleetMap = dynamic(() => import("./fleet-map").then((m) => m.FleetMap), {
  ssr: false,
  loading: () => <div className="bg-muted/40 h-full min-h-[560px] animate-pulse rounded-xl border" />,
});

export function FleetMapLoader({ initial }: { initial: FleetSnapshot }) {
  return <FleetMap initial={initial} />;
}
