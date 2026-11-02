/** Escape sel CSV, plus netralkan formula injection (=, +, -, @) saat dibuka di Excel. */
export function csvCell(v: string | number | boolean | null | undefined) {
  let s = v == null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export const csvRow = (cells: (string | number | boolean | null | undefined)[]) => cells.map(csvCell).join(",");
