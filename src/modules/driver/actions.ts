"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { tripExpenses, trips } from "@/db/schema";
import { requireDriver } from "@/lib/auth/session";
import { KEY_RE } from "@/lib/storage";
import { savePod } from "./pod";
import { activeTripStatuses } from "@/modules/dispatch/status";
import { applyAdvance } from "@/modules/dispatch/transition";

const coord = z.string().regex(/^-?\d+(\.\d+)?$/).optional();
type Result = { error?: string };

function refresh(tripId: string) {
  revalidatePath("/driver");
  revalidatePath(`/driver/trips/${tripId}`);
  revalidatePath(`/dispatch/${tripId}`);
  revalidatePath("/dispatch");
  revalidatePath("/orders");
}

export async function driverAdvance(tripId: string, lat?: string, lng?: string): Promise<Result> {
  const { user, driver } = await requireDriver();
  if (!driver) return { error: "Akun ini belum terhubung ke data driver" };
  const parsed = z.object({ tripId: z.uuid(), lat: coord, lng: coord }).safeParse({ tripId, lat, lng });
  if (!parsed.success) return { error: "Input tidak valid" };
  const res = await applyAdvance(tripId, { id: user.id, role: user.role }, { driverId: driver.id, lat, lng });
  refresh(tripId);
  return res;
}

export async function submitPod(raw: unknown): Promise<Result> {
  const { driver } = await requireDriver();
  if (!driver) return { error: "Akun ini belum terhubung ke data driver" };
  const r = await savePod(raw, { driverId: driver.id });
  if (r.tripId) refresh(r.tripId);
  return r.error ? { error: r.error } : {};
}

const expenseCategories = ["BBM", "TOL", "PARKIR", "MAKAN", "KULI", "LAIN"] as const;

const expenseInput = z.object({
  tripId: z.uuid(),
  category: z.enum(expenseCategories),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Nominal harus angka").refine((a) => Number(a) > 0, "Nominal harus > 0"),
  receiptKey: z.string().regex(KEY_RE).optional(),
});

export async function addExpense(raw: unknown): Promise<Result> {
  const { driver } = await requireDriver();
  if (!driver) return { error: "Akun ini belum terhubung ke data driver" };
  const parsed = expenseInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
  const v = parsed.data;
  const [trip] = await db.select().from(trips).where(and(eq(trips.id, v.tripId), eq(trips.driverId, driver.id)));
  if (!trip) return { error: "Bukan trip Anda" };
  if (![...activeTripStatuses, "DELIVERED"].includes(trip.status as never)) return { error: "Trip sudah ditutup" };
  await db.insert(tripExpenses).values({
    tripId: v.tripId, category: v.category, amount: v.amount, receiptKey: v.receiptKey ?? null,
  });
  refresh(v.tripId);
  return {};
}
