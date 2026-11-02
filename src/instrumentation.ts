export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { assertEnv } = await import("./lib/env");
  const errors = assertEnv();
  if (errors.length) {
    // Keluar dengan kode 1 agar orchestrator (Docker/Dokploy) menandai deploy gagal dan tidak membiarkan server setengah hidup.
    console.error(`Konfigurasi tidak valid:\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
}
