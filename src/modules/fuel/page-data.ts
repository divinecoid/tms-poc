import { loadReviews } from "./queries";
import { buildFuelView, getFuel, unitSeries } from "./view";

/** Data awal halaman Monitoring BBM (rentang 3 hari) beserta unit yang dipilih. */
export async function loadFuelPage(unitParam?: string) {
  const now = Date.now();
  const reviews = await loadReviews(getFuel(now).events.map((e) => e.key));
  const view = buildFuelView(now, 72, reviews);
  const requested = view.units.find((u) => u.unitId === unitParam)?.unitId;
  const unit = requested ?? [...view.units].sort((a, b) => b.openAlerts - a.openAlerts)[0].unitId;
  return { initial: { ...view, series: unitSeries(now, unit, 72) }, unit };
}
