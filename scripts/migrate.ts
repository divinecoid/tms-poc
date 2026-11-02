// Dijalankan otomatis sebelum server start (lihat Dockerfile). Idempotent: hanya menerapkan migrasi yang belum ada.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
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
