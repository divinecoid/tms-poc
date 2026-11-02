"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { compressImage, uploadImage } from "@/lib/client/image";
import { addExpense } from "./actions";

const cats = ["BBM", "TOL", "PARKIR", "MAKAN", "KULI", "LAIN"];

export function ExpenseForm({ tripId }: { tripId: string }) {
  const [pending, start] = useTransition();
  const [category, setCategory] = useState("BBM");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function submit() {
    start(async () => {
      try {
        const receiptKey = file ? await uploadImage(await compressImage(file)) : undefined;
        const r = await addExpense({ tripId, category, amount, receiptKey });
        if (r.error) { toast.error(r.error); return; }
        toast.success("Pengeluaran dicatat");
        setAmount("");
        setFile(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <select
          className="border-input bg-background h-11 rounded-md border px-3"
          value={category} onChange={(e) => setCategory(e.target.value)}
        >
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
        <Input className="h-11" inputMode="numeric" placeholder="Nominal (Rp)" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <input type="file" accept="image/*" capture="environment" className="text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button variant="outline" className="h-11 w-full" disabled={pending} onClick={submit}>
        {pending ? "Menyimpan…" : "Catat pengeluaran"}
      </Button>
    </div>
  );
}
