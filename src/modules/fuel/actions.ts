"use server";

import { z } from "zod";
import { db } from "@/db";
import { auditLogs, fuelEventReviews } from "@/db/schema";
import { requireCan } from "@/lib/auth/session";

const input = z.object({
  key: z.string().regex(/^u\d+:[A-Z_]+:\d{10,}$/, "Kunci kejadian tidak valid"),
  status: z.enum(["REVIEWING", "CONFIRMED", "DISMISSED"]),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
});

export async function reviewFuelEvent(raw: unknown): Promise<{ error?: string }> {
  const user = await requireCan("write", "fuel");
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const { key, status, note } = parsed.data;
  if (status !== "REVIEWING" && !note) return { error: "Catatan wajib diisi untuk keputusan akhir" };

  await db.transaction(async (tx) => {
    await tx
      .insert(fuelEventReviews)
      .values({ eventKey: key, status, note: note || null, reviewedBy: user.id })
      .onConflictDoUpdate({
        target: fuelEventReviews.eventKey,
        set: { status, note: note || null, reviewedBy: user.id, reviewedAt: new Date() },
      });
    await tx.insert(auditLogs).values({
      userId: user.id, entity: "fuel_event", entityId: key, action: `REVIEW_${status}`, diff: { status, note: note ?? null },
    });
  });
  return {};
}
