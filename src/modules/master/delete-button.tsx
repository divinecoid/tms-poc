"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteRecord } from "./actions";

export function DeleteButton({ resourceKey, id }: { resourceKey: string; id: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => confirm("Hapus data ini?") && start(() => deleteRecord(resourceKey, id))}
    >
      Hapus
    </Button>
  );
}
