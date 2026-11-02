import { eq } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import { db, pool } from "../src/db";
import { accounts, users } from "../src/db/schema";

async function main() {
  const prod = process.env.NODE_ENV === "production";
  const email = process.env.SEED_ADMIN_EMAIL ?? (prod ? "" : "owner@tms.local");
  const password = process.env.SEED_ADMIN_PASSWORD ?? (prod ? "" : "ChangeMe123!");
  if (!email || password.length < 12) {
    throw new Error("Produksi: isi SEED_ADMIN_EMAIL dan SEED_ADMIN_PASSWORD (min. 12 karakter), atau pakai user:create");
  }
  const ctx = await auth.$context;
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) return console.log("seed: owner sudah ada");
  const [user] = await db
    .insert(users)
    .values({ name: "Owner", email, emailVerified: true, role: "owner" })
    .returning();
  await db.insert(accounts).values({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(password),
  });
  console.log(`seed: owner ${email} dibuat`);
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
