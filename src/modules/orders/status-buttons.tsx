"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setOrderStatus } from "./actions";

export function OrderStatusButtons({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const go = (s: "CONFIRMED" | "CANCELLED") => start(() => setOrderStatus(id, s));
  return (
    <div className="flex gap-2">
      {status === "DRAFT" && <Button disabled={pending} onClick={() => go("CONFIRMED")}>Konfirmasi order</Button>}
      {(status === "DRAFT" || status === "CONFIRMED") && (
        <Button variant="outline" disabled={pending} onClick={() => confirm("Batalkan order?") && go("CANCELLED")}>
          Batalkan
        </Button>
      )}
    </div>
  );
}
