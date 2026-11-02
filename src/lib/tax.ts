export const PPN_RATE = 0.11;
export const PPH23_RATE = 0.02;

const rp = (n: number) => Math.round(n);

/** Hitung total invoice dalam rupiah bulat. PPh 23 (2% jasa) dipotong oleh customer, jadi mengurangi total tagihan. */
export function invoiceTotals(subtotal: number, opts: { ppn: boolean; pph23: boolean }) {
  const ppn = opts.ppn ? rp(subtotal * PPN_RATE) : 0;
  const pph23 = opts.pph23 ? rp(subtotal * PPH23_RATE) : 0;
  return { subtotal: rp(subtotal), ppn, pph23, total: rp(subtotal) + ppn - pph23 };
}
