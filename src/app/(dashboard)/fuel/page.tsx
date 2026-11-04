import { Suspense } from "react";
import { can } from "@/lib/auth/permissions";
import { requireCan } from "@/lib/auth/session";
import { FuelDashboard } from "@/modules/fuel/fuel-dashboard";
import { loadFuelPage } from "@/modules/fuel/page-data";

async function Content({ searchParams }: { searchParams: Promise<{ unit?: string }> }) {
  const user = await requireCan("read", "fuel");
  const { unit: unitParam } = await searchParams;
  const { initial, unit } = await loadFuelPage(unitParam);
  return <FuelDashboard initial={initial} initialUnit={unit} canWrite={can(user.role, "write", "fuel")} />;
}

export default function Page(props: PageProps<"/fuel">) {
  return (
    <Suspense fallback={<div className="bg-muted/40 h-96 animate-pulse rounded-xl border" />}>
      <Content searchParams={props.searchParams} />
    </Suspense>
  );
}
