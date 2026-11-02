"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markInvoicePaid, voidInvoice } from "./actions";

export function InvoiceActions({ id, status, canWrite }: { id: string; status: string; canWrite: boolean }) {
  const [pending, start] = useTransition();
  const run = (fn: (id: string) => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn(id);
      if (r.error) toast.error(r.error);
    });
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button variant="outline" onClick={() => window.print()}>Cetak / simpan PDF</Button>
      {canWrite && status === "ISSUED" && (
        <>
          <Button disabled={pending} onClick={() => confirm("Tandai invoice ini lunas?") && run(markInvoicePaid)}>Tandai lunas</Button>
          <Button variant="outline" disabled={pending} onClick={() => confirm("Void invoice? Order kembali ke DELIVERED.") && run(voidInvoice)}>Void</Button>
        </>
      )}
    </div>
  );
}
