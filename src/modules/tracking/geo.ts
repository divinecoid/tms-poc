export type LatLng = [lat: number, lng: number];

const R = 6371; // km
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Jarak lingkaran besar dua titik (km). */
export function haversineKm(a: LatLng, b: LatLng) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Arah dari a ke b dalam derajat (0 = utara, 90 = timur). */
export function bearingDeg(a: LatLng, b: LatLng) {
  const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
  const x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export function routeLengthKm(path: LatLng[]) {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += haversineKm(path[i - 1], path[i]);
  return total;
}

/** Titik pada polyline setelah menempuh `km` dari awal (dijepit ke ujung), beserta arah segmennya. */
export function pointAlong(path: LatLng[], km: number): { pos: LatLng; heading: number } {
  if (path.length < 2) return { pos: path[0], heading: 0 };
  let remaining = Math.max(0, km);
  for (let i = 1; i < path.length; i++) {
    const seg = haversineKm(path[i - 1], path[i]);
    if (remaining <= seg || i === path.length - 1) {
      const t = seg === 0 ? 0 : Math.min(1, remaining / seg);
      const [a, b] = [path[i - 1], path[i]];
      return { pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], heading: bearingDeg(a, b) };
    }
    remaining -= seg;
  }
  return { pos: path[path.length - 1], heading: 0 };
}

/** Bolak-balik: jarak tempuh kumulatif d pada rute sepanjang L -> posisi 0..L dan apakah sedang perjalanan pulang. */
export function pingPong(d: number, L: number): { km: number; returning: boolean } {
  if (L <= 0) return { km: 0, returning: false };
  const m = ((d % (2 * L)) + 2 * L) % (2 * L);
  return m <= L ? { km: m, returning: false } : { km: 2 * L - m, returning: true };
}
