/** Berat tertagih (chargeable weight) per kg: 1 CBM dianggap setara VOLUME_FACTOR kg (asumsi, bisa disesuaikan). */
export const VOLUME_FACTOR_KG_PER_CBM = 250;

export const chargeableWeight = (kg: number, cbm: number) => Math.max(kg, cbm * VOLUME_FACTOR_KG_PER_CBM);

/**
 * Bagi biaya trip ke order secara proporsional dengan bobot (rupiah bulat).
 * Total hasil selalu sama dengan biaya; sisa pembulatan masuk ke order terbesar.
 * Jika semua bobot 0, dibagi rata.
 */
export function allocateCost(cost: number, items: { id: string; weight: number }[]): Map<string, number> {
  const out = new Map<string, number>();
  if (items.length === 0) return out;
  const total = items.reduce((a, i) => a + Math.max(0, i.weight), 0);
  const shares = items.map((i) => ({
    id: i.id,
    w: total > 0 ? Math.max(0, i.weight) / total : 1 / items.length,
  }));
  let assigned = 0;
  for (const s of shares) {
    const v = Math.round(cost * s.w);
    out.set(s.id, v);
    assigned += v;
  }
  const largest = shares.reduce((a, b) => (b.w > a.w ? b : a));
  out.set(largest.id, (out.get(largest.id) ?? 0) + (Math.round(cost) - assigned));
  return out;
}
