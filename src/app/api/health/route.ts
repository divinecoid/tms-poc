import { pool } from "@/db";

export async function GET() {
  try {
    await pool.query("select 1");
    return Response.json({ status: "ok", db: "up" });
  } catch {
    return Response.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
