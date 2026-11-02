import { auth } from "@/lib/auth";
import { csvRow } from "@/lib/csv";
import { isIsoDate, monthStartJakarta, todayJakarta } from "@/lib/dates";
import { can, type Role } from "@/lib/auth/permissions";
import { marginPct, marginReport } from "@/modules/reports/margin";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (!can(session.user.role as Role, "read", "reports")) return new Response("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const f = url.searchParams.get("from") ?? undefined;
  const t = url.searchParams.get("to") ?? undefined;
  const from = isIsoDate(f) ? f : monthStartJakarta();
  const to = isIsoDate(t) ? t : todayJakarta();
  if (from > to) return new Response("Rentang tanggal tidak valid", { status: 400 });

  const report = await marginReport(from, to);
  const lines = [
    csvRow(["Order", "Customer", "Trip", "Armada", "Status trip", "Biaya final", "Sudah ditagih", "Pendapatan", "Biaya", "Margin", "Margin %"]),
    ...report.rows.map((r) =>
      csvRow([
        r.orderNo, r.customer, r.tripNo, r.fulfillment === "OWN" ? "Sendiri" : "Vendor", r.tripStatus,
        r.costFinal, r.billed, r.billed ? r.revenue : "", r.cost, r.billed ? r.margin : "",
        r.billed ? marginPct(r.margin, r.revenue).toFixed(1) : "",
      ]),
    ),
  ];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="margin_${from}_${to}.csv"`,
    },
  });
}
