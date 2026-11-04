import { assertEnv } from "./lib/env";

export function validateEnvOrExit() {
  const errors = assertEnv();
  if (errors.length) {
    // Keluar dengan kode 1 agar orchestrator (Docker/Dokploy) menandai deploy gagal dan tidak membiarkan server setengah hidup.
    console.error(`Konfigurasi tidak valid:\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
}
