import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { drivers, gpsPoints, trips } from "@/db/schema";
import { auth } from "@/lib/auth";
import { trackingStatuses } from "@/modules/dispatch/status";

const body = z.object({
  tripId: z.uuid(),
  points: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        speed: z.number().min(0).max(300).optional(),
        ts: z.iso.datetime(),
      }),
    )
    .min(1)
    .max(100),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Payload tidak valid" }, { status: 400 });
  const { tripId, points } = parsed.data;

  const [driver] = await db.select().from(drivers).where(eq(drivers.userId, session.user.id));
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId));
  if (!driver || !trip || trip.driverId !== driver.id) return Response.json({ error: "Forbidden" }, { status: 403 });
  if (!(trackingStatuses as readonly string[]).includes(trip.status)) return Response.json({ saved: 0 });

  const now = Date.now();
  const fresh = points.filter((p) => {
    const t = Date.parse(p.ts);
    return t < now + 5 * 60_000 && t > now - 24 * 3600_000;
  });
  if (fresh.length) {
    await db.insert(gpsPoints).values(
      fresh.map((p) => ({
        tripId, vehicleId: trip.vehicleId, source: "PHONE",
        lat: p.lat.toFixed(6), lng: p.lng.toFixed(6),
        speedKmh: p.speed != null ? p.speed.toFixed(2) : null,
        recordedAt: new Date(p.ts),
      })),
    );
  }
  return Response.json({ saved: fresh.length });
}
