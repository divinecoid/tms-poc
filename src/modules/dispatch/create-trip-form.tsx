"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTrip } from "./actions";

type Pending = { id: string; orderNo: string; serviceType: string; customer: string; route: string; kg: number; cbm: number };
type Opt = { id: string; label: string; busy?: boolean };
const selectCls = "border-input bg-background h-9 w-full rounded-md border px-3 text-sm";

export function CreateTripForm(props: { pending: Pending[]; vehicles: Opt[]; drivers: Opt[]; vendors: Opt[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [fulfillment, setFulfillment] = useState<"OWN" | "VENDOR">("OWN");
  const [f, setF] = useState({
    vehicleId: "", driverId: "", vendorId: "", vendorPlate: "", vendorDriverName: "", vendorDriverPhone: "", vendorCost: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const total = useMemo(() => {
    const sel = props.pending.filter((o) => picked.includes(o.id));
    return { kg: sel.reduce((a, o) => a + o.kg, 0), cbm: sel.reduce((a, o) => a + o.cbm, 0) };
  }, [picked, props.pending]);

  if (props.pending.length === 0) {
    return <p className="text-muted-foreground text-sm">Tidak ada order berstatus CONFIRMED yang menunggu dispatch.</p>;
  }

  function submit() {
    setError("");
    start(async () => {
      const res = await createTrip({ orderIds: picked, fulfillment, ...f });
      if (res.error) return setError(res.error);
      setPicked([]);
      router.push(`/dispatch/${res.id}`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {props.pending.map((o) => (
          <label key={o.id} className="hover:bg-accent flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={picked.includes(o.id)}
              onChange={(e) => setPicked((p) => (e.target.checked ? [...p, o.id] : p.filter((x) => x !== o.id)))}
            />
            <span className="flex-1">
              <span className="font-medium">{o.orderNo}</span> · {o.customer} · {o.serviceType}
              <span className="text-muted-foreground block">{o.route}</span>
            </span>
            <span className="text-muted-foreground text-right">{o.kg} kg<br />{o.cbm} CBM</span>
          </label>
        ))}
      </div>
      {picked.length > 0 && (
        <p className="text-sm">
          Dipilih {picked.length} order · total <b>{total.kg} kg</b> / <b>{total.cbm} CBM</b>
          {picked.length > 1 && " (konsolidasi)"}
        </p>
      )}

      <div className="flex gap-2">
        <Button variant={fulfillment === "OWN" ? "default" : "outline"} size="sm" onClick={() => setFulfillment("OWN")}>Armada sendiri</Button>
        <Button variant={fulfillment === "VENDOR" ? "default" : "outline"} size="sm" onClick={() => setFulfillment("VENDOR")}>Vendor / Subcon</Button>
      </div>

      {fulfillment === "OWN" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Kendaraan *</Label>
            <select className={selectCls} value={f.vehicleId} onChange={(e) => set("vehicleId", e.target.value)}>
              <option value="">— pilih —</option>
              {props.vehicles.map((v) => <option key={v.id} value={v.id} disabled={v.busy}>{v.label}{v.busy ? " (sedang jalan)" : ""}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Driver *</Label>
            <select className={selectCls} value={f.driverId} onChange={(e) => set("driverId", e.target.value)}>
              <option value="">— pilih —</option>
              {props.drivers.map((d) => <option key={d.id} value={d.id} disabled={d.busy}>{d.label}{d.busy ? " (sedang jalan)" : ""}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Vendor *</Label>
            <select className={selectCls} value={f.vendorId} onChange={(e) => set("vendorId", e.target.value)}>
              <option value="">— pilih —</option>
              {props.vendors.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Plat truk *</Label><Input value={f.vendorPlate} onChange={(e) => set("vendorPlate", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Biaya vendor (Rp)</Label><Input inputMode="decimal" value={f.vendorCost} onChange={(e) => set("vendorCost", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Nama driver vendor</Label><Input value={f.vendorDriverName} onChange={(e) => set("vendorDriverName", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>HP driver vendor</Label><Input value={f.vendorDriverPhone} onChange={(e) => set("vendorDriverPhone", e.target.value)} /></div>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button onClick={submit} disabled={busy || picked.length === 0}>{busy ? "Membuat trip…" : "Buat trip"}</Button>
    </div>
  );
}
