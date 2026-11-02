/** Validasi environment saat server mulai. Gagal cepat daripada jalan dengan konfigurasi berbahaya. */
export function assertEnv(env: NodeJS.ProcessEnv = process.env) {
  const errors: string[] = [];
  const prod = env.NODE_ENV === "production";

  if (!env.DATABASE_URL) errors.push("DATABASE_URL belum diisi");

  const secret = env.BETTER_AUTH_SECRET ?? "";
  if (prod) {
    if (secret.length < 32) errors.push("BETTER_AUTH_SECRET minimal 32 karakter (buat dengan: openssl rand -base64 32)");
    if (/change-?me/i.test(secret)) errors.push("BETTER_AUTH_SECRET masih nilai contoh");
    const url = env.BETTER_AUTH_URL ?? "";
    if (!/^https?:\/\/[^/\s]+/.test(url)) {
      errors.push("BETTER_AUTH_URL harus berupa URL lengkap, mis. https://tms.contoh.id atau http://IP:PORT");
    } else if (url.startsWith("http://") && env.ALLOW_INSECURE_HTTP !== "true") {
      errors.push("BETTER_AUTH_URL http:// hanya diizinkan bila ALLOW_INSECURE_HTTP=true (sesi & password berjalan tanpa enkripsi)");
    }
    if (!env.UPLOAD_DIR) errors.push("UPLOAD_DIR belum diisi (arahkan ke volume persisten, mis. /app/uploads)");
  }
  return errors;
}
