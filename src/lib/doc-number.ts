import { sql } from "drizzle-orm";
import type { db } from "@/db";
import { docCounters } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Nomor dokumen berurutan per bulan, mis. ORD-2026-11-0001. Atomic via upsert. */
export async function nextDocNo(tx: Tx, prefix: "ORD" | "TRP" | "INV" | "VB") {
  const d = new Date();
  const key = `${prefix}-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const [row] = await tx
    .insert(docCounters)
    .values({ key, value: 1 })
    .onConflictDoUpdate({ target: docCounters.key, set: { value: sql`${docCounters.value} + 1` } })
    .returning({ value: docCounters.value });
  return `${key}-${String(row.value).padStart(4, "0")}`;
}
