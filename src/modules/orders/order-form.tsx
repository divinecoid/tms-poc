"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrder } from "./actions";

type Opt = { id: string; name: string };
type Stop = { type: "PICKUP" | "DROP"; locationId: string; cargo: string; weightKg: string; cbm: string; pallets: string };

const blank = (type: Stop["type"]): Stop => ({ type, locationId: "", cargo: "", weightKg: "", cbm: "", pallets: "" });
const selectCls = "border-input bg-background h-9 w-full rounded-md border px-3 text-sm";

export function OrderForm({ customers, locations }: { customers: Opt[]; locations: Opt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [serviceType, setServiceType] = useState("FTL");
  const [requestedDate, setRequestedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [stops, setStops] = useState<Stop[]>([blank("PICKUP"), blank("DROP")]);

  const patch = (i: number, p: Partial<Stop>) =>
    setStops((s) => s.map((x, j) => (j === i ? { ...x, ...p } : x)));

  function submit() {
    setError("");
    start(async () => {
      const res = await createOrder({ customerId, serviceType, requestedDate, notes, stops });
      if (res.error) return setError(res.error);
      router.push(`/orders/${res.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Informasi order</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Customer *</Label>
            <select className={selectCls} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">— pilih —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Tipe layanan *</Label>
            <select className={selectCls} value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
              <option value="FTL">FTL (1 pickup → 1 drop)</option>
              <option value="MULTIDROP">Multi-drop</option>
              <option value="LTL">LTL (konsolidasi)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Tanggal permintaan</Label>
            <Input type="date" value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Stop & muatan</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {stops.map((s, i) => (
            <div key={i} className="grid items-end gap-3 rounded-md border p-3 sm:grid-cols-12">
              <div className="sm:col-span-2">
                <Label className="mb-1.5 block">#{i + 1} Tipe</Label>
                <select className={selectCls} value={s.type} onChange={(e) => patch(i, { type: e.target.value as Stop["type"] })}>
                  <option value="PICKUP">Pickup</option>
                  <option value="DROP">Drop</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <Label className="mb-1.5 block">Lokasi *</Label>
                <select className={selectCls} value={s.locationId} onChange={(e) => patch(i, { locationId: e.target.value })}>
                  <option value="">— pilih —</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <Label className="mb-1.5 block">Muatan</Label>
                <Input value={s.cargo} onChange={(e) => patch(i, { cargo: e.target.value })} placeholder="mis. Beras 50kg" />
              </div>
              <div className="sm:col-span-1">
                <Label className="mb-1.5 block">Kg</Label>
                <Input inputMode="decimal" value={s.weightKg} onChange={(e) => patch(i, { weightKg: e.target.value })} />
              </div>
              <div className="sm:col-span-1">
                <Label className="mb-1.5 block">CBM</Label>
                <Input inputMode="decimal" value={s.cbm} onChange={(e) => patch(i, { cbm: e.target.value })} />
              </div>
              <div className="flex items-end gap-2 sm:col-span-2">
                <div className="min-w-0 flex-1">
                  <Label className="mb-1.5 block">Pallet</Label>
                  <Input inputMode="numeric" value={s.pallets} onChange={(e) => patch(i, { pallets: e.target.value })} />
                </div>
                {stops.length > 2 && (
                  <Button variant="ghost" size="icon" aria-label="Hapus stop" onClick={() => setStops((x) => x.filter((_, j) => j !== i))}><X className="size-4" /></Button>
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStops((s) => [...s, blank("PICKUP")])}>+ Pickup</Button>
            <Button variant="outline" size="sm" onClick={() => setStops((s) => [...s, blank("DROP")])}>+ Drop</Button>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button onClick={submit} disabled={pending}>{pending ? "Menyimpan…" : "Simpan order (Draft)"}</Button>
    </div>
  );
}
