"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { advanceTrip, cancelTrip } from "./actions";
import { nextStatus, statusLabel } from "./status";

export function TripActions({ id, status, canSettle }: { id: string; status: string; canSettle: boolean }) {
  const [pending, start] = useTransition();
  const next = nextStatus(status);
  const blocked = next === "SETTLED" && !canSettle;
  return (
    <div className="flex gap-2">
      {next && !blocked && (
        <Button disabled={pending} onClick={() => start(async () => {
          const r = await advanceTrip(id);
          if (r.error) toast.error(r.error);
        })}>
          → {statusLabel[next]}
        </Button>
      )}
      {status === "ASSIGNED" && (
        <Button variant="outline" disabled={pending} onClick={() => confirm("Batalkan trip? Order kembali ke CONFIRMED.") && start(() => cancelTrip(id))}>
          Batalkan trip
        </Button>
      )}
    </div>
  );
}
