import { auth } from "@/lib/auth";
import { can, type Role } from "@/lib/auth/permissions";
import { loadReviews } from "@/modules/fuel/queries";
import { buildFuelView, getFuel, unitSeries } from "@/modules/fuel/view";

const RANGES = [24, 72, 168];

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role as Role, "read", "fuel")) return Response.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const h = Number(url.searchParams.get("hours"));
  const hours = RANGES.includes(h) ? h : 72;
  const unit = url.searchParams.get("unit");
  const now = Date.now();

  const keys = getFuel(now).events.map((e) => e.key);
  const reviews = await loadReviews(keys);
  const view = buildFuelView(now, hours, reviews);
  const series = unit ? unitSeries(now, unit, hours) : null;
  if (unit && !series) return Response.json({ error: "Unit tidak ditemukan" }, { status: 404 });

  return Response.json({ ...view, series }, { headers: { "cache-control": "no-store" } });
}
