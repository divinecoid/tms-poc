export function fmtTime(ms: number, withDate = true) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(ms);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hm = `${g("hour")}:${g("minute")}`;
  return withDate ? `${g("day")} ${g("month")} ${hm}` : hm;
}

export const fmtDay = (ms: number) =>
  new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short" }).format(ms);

export const fmtL = (n: number) => `${Math.round(n).toLocaleString("id-ID")} L`;
export const fmtRp = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export const osmLink = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;
