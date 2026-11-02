import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { drivers } from "@/db/schema";
import { auth } from ".";
import { can, type Action, type Resource, type Role } from "./permissions";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  return { ...session.user, role: session.user.role as Role };
}

export async function requireCan(action: Action, resource: Resource) {
  const user = await requireUser();
  if (!can(user.role, action, resource)) redirect("/?forbidden=1");
  return user;
}

export async function requireDriver() {
  const user = await requireUser();
  const [driver] = await db.select().from(drivers).where(eq(drivers.userId, user.id));
  return { user, driver: driver ?? null };
}
