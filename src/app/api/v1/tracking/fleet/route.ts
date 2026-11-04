import { auth } from "@/lib/auth";
import { can, type Role } from "@/lib/auth/permissions";
import { getFleetSnapshot } from "@/modules/tracking/fleet-snapshot";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(session.user.role as Role, "read", "dispatch")) return Response.json({ error: "Forbidden" }, { status: 403 });
  // Saat ini data simulasi. Untuk data nyata, ganti dengan titik GPS terakhir per kendaraan (tabel gps_points).
  const includeFuel = can(session.user.role as Role, "read", "fuel");
  return Response.json(getFleetSnapshot(new Date(), includeFuel), { headers: { "cache-control": "no-store" } });
}
