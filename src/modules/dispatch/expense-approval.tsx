"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setExpenseStatus } from "./actions";

export function ExpenseApproval({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <span className="flex gap-1">
      <Button size="sm" disabled={pending} onClick={() => start(() => setExpenseStatus(id, "APPROVED"))}>Setujui</Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => start(() => setExpenseStatus(id, "REJECTED"))}>Tolak</Button>
    </span>
  );
}
