import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orderStops, pods, tripStops, trips } from "@/db/schema";
import { KEY_RE } from "@/lib/storage";

const coord = z.string().regex(/^-?\d+(\.\d+)?$/).optional();

export const podInput = z.object({
  tripStopId: z.uuid(),
  receiverName: z.string().trim().min(2, "Nama penerima wajib diisi"),
  signatureKey: z.string().regex(KEY_RE, "Tanda tangan wajib diisi"),
  photoKeys: z.array(z.string().regex(KEY_RE)).max(5),
  lat: coord,
  lng: coord,
});

type Who = { driverId: string } | { vendorTrip: true };

/** Simpan e-POD untuk satu stop drop. Driver hanya untuk trip sendiri; dispatcher hanya untuk trip vendor. */
export async function savePod(raw: unknown, who: Who): Promise<{ error?: string; tripId?: string }> {
  const parsed = podInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const v = parsed.data;

  const [row] = await db
    .select({
      tripId: trips.id, driverId: trips.driverId, fulfillment: trips.fulfillment, status: trips.status, type: orderStops.type,
    })
    .from(tripStops)
    .innerJoin(trips, eq(trips.id, tripStops.tripId))
    .innerJoin(orderStops, eq(orderStops.id, tripStops.orderStopId))
    .where(eq(tripStops.id, v.tripStopId));
  if (!row) return { error: "Stop tidak ditemukan" };
  if ("driverId" in who) {
    if (row.driverId !== who.driverId) return { error: "Bukan trip Anda" };
  } else if (row.fulfillment !== "VENDOR") {
    return { error: "POD manual hanya untuk trip vendor" };
  }
  if (row.type !== "DROP") return { error: "POD hanya untuk stop drop" };
  if (row.status !== "AT_DROP") return { error: "Tandai 'Di lokasi drop' dulu sebelum mengisi POD" };
  const [dup] = await db.select({ id: pods.id }).from(pods).where(eq(pods.tripStopId, v.tripStopId));
  if (dup) return { error: "POD untuk stop ini sudah ada" };

  await db.transaction(async (tx) => {
    await tx.insert(pods).values({
      tripStopId: v.tripStopId, receiverName: v.receiverName, signatureKey: v.signatureKey,
      photoKeys: v.photoKeys, lat: v.lat ?? null, lng: v.lng ?? null,
    });
    await tx.update(tripStops).set({ departedAt: new Date() }).where(eq(tripStops.id, v.tripStopId));
  });
  return { tripId: row.tripId };
}
