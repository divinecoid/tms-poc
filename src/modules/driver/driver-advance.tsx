"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { currentPosition } from "@/lib/client/image";
import { driverAdvance } from "./actions";

export function DriverAdvance({ tripId, label }: { tripId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      className="h-16 w-full text-lg"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const pos = await currentPosition();
          const r = await driverAdvance(tripId, pos?.lat, pos?.lng);
          if (r.error) toast.error(r.error);
        })
      }
    >
      {pending ? "Memproses…" : label}
    </Button>
  );
}
