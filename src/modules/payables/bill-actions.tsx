"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { approveVendorBill, createVendorBill, payVendorBill } from "./actions";

type Fn = (id: string) => Promise<{ error?: string }>;

function useRun() {
  const [pending, start] = useTransition();
  const run = (fn: Fn, id: string) =>
    start(async () => {
      const r = await fn(id);
      if (r.error) toast.error(r.error);
    });
  return { pending, run };
}

export function CreateBillButton({ tripId }: { tripId: string }) {
  const { pending, run } = useRun();
  return <Button size="sm" disabled={pending} onClick={() => run(createVendorBill, tripId)}>Buat tagihan</Button>;
}

export function BillActions({ id, status }: { id: string; status: string }) {
  const { pending, run } = useRun();
  if (status === "PENDING") return <Button size="sm" disabled={pending} onClick={() => run(approveVendorBill, id)}>Setujui</Button>;
  if (status === "APPROVED") {
    return (
      <Button size="sm" disabled={pending} onClick={() => confirm("Tandai tagihan ini sudah dibayar?") && run(payVendorBill, id)}>
        Tandai dibayar
      </Button>
    );
  }
  return null;
}
