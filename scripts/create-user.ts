// Pemakaian: npm run user:create -- <email> <password> <role> <nama> [driverId]
import { eq } from "drizzle-orm";
import { auth } from "../src/lib/auth";
import { db, pool } from "../src/db";
import { accounts, drivers, users } from "../src/db/schema";
import { roles } from "../src/lib/auth/permissions";

async function main() {
  const [email, password, role, name, driverId] = process.argv.slice(2);
  if (!email || !password || !role || !name) throw new Error("Usage: user:create <email> <password> <role> <nama> [driverId]");
  if (!(roles as readonly string[]).includes(role)) throw new Error(`role harus salah satu: ${roles.join(", ")}`);
  if (password.length < 8) throw new Error("password minimal 8 karakter");
  const ctx = await auth.$context;
  const [user] = await db.insert(users).values({ name, email, emailVerified: true, role: role as never }).returning();
  await db.insert(accounts).values({
    userId: user.id, providerId: "credential", accountId: user.id, password: await ctx.password.hash(password),
  });
  if (driverId) {
    if (role !== "driver") throw new Error("driverId hanya untuk role driver");
    await db.update(drivers).set({ userId: user.id }).where(eq(drivers.id, driverId));
  }
  console.log(`user ${email} (${role}) dibuat${driverId ? `, terhubung ke driver ${driverId}` : ""}`);
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
