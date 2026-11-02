// Dijalankan otomatis sebelum server start (lihat Dockerfile). Idempotent: hanya menerapkan migrasi yang belum ada.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Diagnostik: hanya status ada/kosong dan nama variabel, tidak pernah nilainya.
function reportEnv() {
  const keys = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "APP_URL", "UPLOAD_DIR", "ALLOW_INSECURE_HTTP"];
  console.log("status env:", keys.map((k) => `${k}=${process.env[k] ? "ada" : "KOSONG"}`).join(" "));
  console.log("nama env di container:", Object.keys(process.env).sort().join(","));
}

async function main() {
  reportEnv();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diisi");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: process.env.MIGRATIONS_DIR ?? "./drizzle" });
    console.log("migrasi selesai");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("migrasi GAGAL:", e.message);
  process.exit(1);
});
