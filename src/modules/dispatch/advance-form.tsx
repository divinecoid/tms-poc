"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAdvance } from "./actions";

export function AdvanceForm({ tripId, current }: { tripId: string; current: string | null }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(current ? String(Number(current)) : "");
  return (
    <div className="flex items-center gap-2">
      <Input className="w-40" inputMode="numeric" placeholder="Uang jalan (Rp)" value={value} onChange={(e) => setValue(e.target.value)} />
      <Button
        size="sm" variant="outline" disabled={pending || !value}
        onClick={() =>
          start(async () => {
            const r = await setAdvance(tripId, value);
            if (r.error) toast.error(r.error);
            else toast.success("Uang jalan disimpan");
          })
        }
      >
        Simpan
      </Button>
    </div>
  );
}
