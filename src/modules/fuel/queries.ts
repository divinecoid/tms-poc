import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { fuelEventReviews } from "@/db/schema";
import type { Review, ReviewStatus } from "./types";

export async function loadReviews(keys: string[]): Promise<Map<string, Review>> {
  if (keys.length === 0) return new Map();
  const rows = await db.select().from(fuelEventReviews).where(inArray(fuelEventReviews.eventKey, keys));
  return new Map(rows.map((r) => [r.eventKey, { status: r.status as ReviewStatus, note: r.note }]));
}
