"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rupiah } from "@/lib/money";
import { invoiceTotals } from "@/lib/tax";
import { createInvoice } from "./actions";

type Billable = { id: string; orderNo: string; customerId: string; customer: string; route: string; priceTotal: string | null };

export function InvoiceForm({ billable }: { billable: Billable[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const customers = useMemo(
    () => [...new Map(billable.map((b) => [b.customerId, b.customer])).entries()],
    [billable],
  );
  const [customerId, setCustomerId] = useState("");
  const [issuedAt, setIssuedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [ppn, setPpn] = useState(true);
  const [pph23, setPph23] = useState(false);
  const [picked, setPicked] = useState<Record<string, string>>({});

  const rows = billable.filter((b) => b.customerId === customerId);
  const subtotal = rows.reduce((a, r) => a + (r.id in picked ? Number(picked[r.id]) || 0 : 0), 0);
  const t = invoiceTotals(subtotal, { ppn, pph23 });

  function submit() {
    setError("");
    start(async () => {
      const lines = Object.entries(picked).map(([orderId, amount]) => ({ orderId, amount }));
      const res = await createInvoice({ customerId, issuedAt, ppn, pph23, lines });
      if (res.error) { setError(res.error); return; }
      router.push(`/invoices/${res.id}`);
    });
  }

  if (billable.length === 0) {
    return <p className="text-muted-foreground text-sm">Tidak ada order berstatus DELIVERED yang menunggu ditagih.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Customer *</Label>
          <select
            className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            value={customerId}
            onChange={(e) => { setCustomerId(e.target.value); setPicked({}); }}
          >
            <option value="">— pilih —</option>
            {customers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Tanggal invoice</Label>
          <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
        </div>
      </div>

      {rows.map((r) => {
        const on = r.id in picked;
        return (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox" checked={on}
              onChange={(e) =>
                setPicked((p) => {
                  const n = { ...p };
                  if (e.target.checked) n[r.id] = r.priceTotal ? String(Number(r.priceTotal)) : "";
                  else delete n[r.id];
                  return n;
                })
              }
            />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{r.orderNo}</span>
              <span className="text-muted-foreground block truncate">{r.route}</span>
            </span>
            <Input
              className="w-40" inputMode="numeric" placeholder="Harga (Rp)" disabled={!on}
              value={picked[r.id] ?? ""} onChange={(e) => setPicked((p) => ({ ...p, [r.id]: e.target.value }))}
            />
          </div>
        );
      })}

      {customerId && (
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={ppn} onChange={(e) => setPpn(e.target.checked)} /> PPN 11%</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={pph23} onChange={(e) => setPph23(e.target.checked)} /> PPh 23 (2%, dipotong customer)</label>
          <div className="max-w-xs space-y-1 rounded-md border p-3">
            <p className="flex justify-between"><span>Subtotal</span><span>{rupiah(t.subtotal)}</span></p>
            <p className="flex justify-between"><span>PPN</span><span>{rupiah(t.ppn)}</span></p>
            <p className="flex justify-between"><span>PPh 23</span><span>− {rupiah(t.pph23)}</span></p>
            <p className="flex justify-between border-t pt-1 font-semibold"><span>Total tagihan</span><span>{rupiah(t.total)}</span></p>
          </div>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button onClick={submit} disabled={pending || Object.keys(picked).length === 0}>
        {pending ? "Membuat…" : "Terbitkan invoice"}
      </Button>
    </div>
  );
}
