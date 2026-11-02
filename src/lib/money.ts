export const rupiah = (n: number | string | null | undefined) =>
  `Rp ${Number(n ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
