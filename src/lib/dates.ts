const TZ = "Asia/Jakarta";

/** Tanggal hari ini di WIB, format YYYY-MM-DD. */
export const todayJakarta = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });

export const monthStartJakarta = () => `${todayJakarta().slice(0, 8)}01`;

/** Batas [from, to] tanggal WIB (inklusif) menjadi rentang timestamp [start, end). */
export function jakartaRange(from: string, to: string) {
  const start = new Date(`${from}T00:00:00+07:00`);
  const end = new Date(`${to}T00:00:00+07:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export const isIsoDate = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
