"use client";

import { Check, CircleCheck, Droplets, ExternalLink, Eye, Fuel, Gauge, MapPin, ShieldAlert, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { reviewFuelEvent } from "./actions";
import { fmtL, fmtRp, fmtTime, osmLink } from "./format";
import { FuelChart } from "./fuel-chart";
import { eventTypeLabel, type FuelEvent, type ReviewStatus, type Severity } from "./types";
import type { FuelView } from "./view";

export type FuelPayload = FuelView & {
  series: { unitId: string; plate: string; tankLiters: number; points: [number, number, number][] } | null;
};

const RANGES = [
  { h: 24, label: "24 jam" },
  { h: 72, label: "3 hari" },
  { h: 168, label: "7 hari" },
];

const sevMeta: Record<Severity, { label: string; cls: string; dot: string }> = {
  HIGH: { label: "Tinggi", cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  MEDIUM: { label: "Sedang", cls: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  LOW: { label: "Rendah", cls: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
};
const statusMeta: Record<ReviewStatus, { label: string; cls: string }> = {
  OPEN: { label: "Terbuka", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  REVIEWING: { label: "Ditinjau", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  CONFIRMED: { label: "Terkonfirmasi", cls: "bg-red-50 text-red-700 ring-red-200" },
  DISMISSED: { label: "Alarm palsu", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", className)}>{children}</span>;
}

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: typeof Fuel; label: string; value: string; hint?: string; tone?: "bad" | "ok" }) {
  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        <Icon className="size-4" strokeWidth={1.75} /> {label}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tracking-tight", tone === "bad" && "text-red-600", tone === "ok" && "text-emerald-600")}>{value}</p>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  );
}

export function FuelDashboard({ initial, initialUnit, canWrite }: { initial: FuelPayload; initialUnit: string; canWrite: boolean }) {
  const [data, setData] = useState(initial);
  const [hours, setHours] = useState(initial.hours);
  const [unitId, setUnitId] = useState(initialUnit);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [sev, setSev] = useState<Severity | "ALL">("ALL");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const first = useRef(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/v1/fuel?hours=${hours}&unit=${unitId}`, { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch {
      /* pertahankan data terakhir */
    }
  }, [hours, unitId]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const alerts = useMemo(
    () =>
      data.events
        .filter((e) => e.kind === "ALERT")
        .filter((e) => (onlyOpen ? e.status === "OPEN" || e.status === "REVIEWING" : true))
        .filter((e) => sev === "ALL" || e.severity === sev),
    [data.events, onlyOpen, sev],
  );
  const unitEvents = useMemo(() => data.events.filter((e) => e.unitId === unitId), [data.events, unitId]);
  const selected = data.events.find((e) => e.key === selectedKey) ?? null;
  const unit = data.units.find((u) => u.unitId === unitId);

  function pick(e: FuelEvent) {
    setSelectedKey(e.key);
    setUnitId(e.unitId);
    setNote(e.note ?? "");
    setError("");
  }

  async function review(status: "REVIEWING" | "CONFIRMED" | "DISMISSED") {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const r = await reviewFuelEvent({ key: selected.key, status, note });
      if (r.error) setError(r.error);
      else await load();
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    }
    setBusy(false);
  }

  const k = data.kpi;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monitoring BBM</h1>
          <p className="text-muted-foreground text-sm">Level tangki tiap 10 menit, deteksi penyedotan, kebocoran, dan selisih struk.</p>
        </div>
        <div className="flex items-center gap-3">
          {data.source === "DEMO" && <Pill className="bg-amber-50 text-amber-800 ring-amber-300">Data simulasi</Pill>}
          <div className="bg-muted inline-flex rounded-lg p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.h}
                onClick={() => setHours(r.h)}
                className={cn("rounded-md px-3 py-1.5 text-xs font-medium transition", hours === r.h ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ShieldAlert} label="Peringatan terbuka" value={String(k.openAlerts)} hint={k.highAlerts ? `${k.highAlerts} berprioritas tinggi` : "tidak ada yang tinggi"} tone={k.highAlerts ? "bad" : "ok"} />
        <Kpi icon={Droplets} label="Dugaan BBM hilang" value={fmtL(k.lossLiters)} hint="penyedotan + kebocoran, di luar yang ditolak" tone={k.lossLiters ? "bad" : undefined} />
        <Kpi icon={Fuel} label="Estimasi kerugian" value={fmtRp(k.lossRupiah)} hint={`asumsi ${fmtRp(data.priceAssumption)}/liter`} />
        <Kpi
          icon={Gauge}
          label="Konsumsi rata-rata"
          value={k.avgKmPerLiter ? `${k.avgKmPerLiter.toLocaleString("id-ID")} km/L` : "—"}
          hint={k.baselineKmPerLiter ? `acuan jenis unit ${k.baselineKmPerLiter.toLocaleString("id-ID")} km/L` : undefined}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[400px_1fr]">
        <section className="bg-card flex max-h-[640px] min-h-[360px] flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="space-y-3 border-b p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Peringatan <span className="text-muted-foreground font-normal">({alerts.length})</span></h2>
              <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
                <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> Hanya yang belum selesai
              </label>
            </div>
            <div className="flex gap-1.5">
              {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSev(s)}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition", sev === s ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                >
                  {s === "ALL" ? "Semua" : sevMeta[s].label}
                </button>
              ))}
            </div>
          </div>
          <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
            {alerts.length === 0 && (
              <li className="text-muted-foreground flex flex-col items-center gap-2 p-10 text-center text-sm">
                <CircleCheck className="size-8 text-emerald-500" strokeWidth={1.5} />
                Tidak ada peringatan pada rentang ini.
              </li>
            )}
            {alerts.map((e) => (
              <li key={e.key}>
                <button onClick={() => pick(e)} className={cn("flex w-full gap-3 px-4 py-3 text-left transition", selectedKey === e.key ? "bg-primary/5" : "hover:bg-muted/50")}>
                  <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", sevMeta[e.severity].dot)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{e.title}</span>
                      <Pill className={statusMeta[e.status].cls}>{statusMeta[e.status].label}</Pill>
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">{e.plate} · {fmtTime(e.at)}</span>
                    <span className="mt-0.5 block text-xs">
                      {e.type === "SENSOR_FLATLINE" ? "Sensor tidak berubah" : `${Math.round(e.liters)} L`}
                      {e.type === "RECEIPT_MISMATCH" && e.receiptLiters ? ` (struk ${Math.round(e.receiptLiters)} L)` : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-card min-w-0 rounded-xl border p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">{unit?.plate ?? "—"} <span className="text-muted-foreground font-normal">· {unit?.driver} · {unit?.vehicleType}</span></h2>
              <p className="text-muted-foreground text-xs">Level tangki ({data.series?.tankLiters ?? unit?.tankLiters} L). Area abu-abu = truk berhenti.</p>
            </div>
            <select
              value={unitId}
              onChange={(e) => { setUnitId(e.target.value); setSelectedKey(null); }}
              className="border-input bg-background h-9 rounded-lg border px-3 text-sm"
              aria-label="Pilih unit"
            >
              {data.units.map((u) => <option key={u.unitId} value={u.unitId}>{u.plate}{u.openAlerts ? ` (${u.openAlerts})` : ""}</option>)}
            </select>
          </div>

          {data.series && data.series.unitId === unitId ? (
            <div className="overflow-x-auto"><FuelChart points={data.series.points} tank={data.series.tankLiters} events={unitEvents} selectedKey={selectedKey} onSelect={(k2) => { const e = data.events.find((x) => x.key === k2); if (e) pick(e); }} hours={hours} /></div>
          ) : (
            <div className="bg-muted/40 h-64 animate-pulse rounded-lg" />
          )}

          <div className="text-muted-foreground mt-2 flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-red-600" /> Tinggi</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-amber-600" /> Sedang</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-slate-500" /> Rendah</span>
            <span className="flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-emerald-600" /> Pengisian wajar</span>
          </div>

          {selected ? (
            <div className="mt-4 space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{eventTypeLabel[selected.type]}</h3>
                {selected.kind === "ALERT" && <Pill className={sevMeta[selected.severity].cls}>{sevMeta[selected.severity].label}</Pill>}
                <Pill className={statusMeta[selected.status].cls}>{statusMeta[selected.status].label}</Pill>
              </div>
              <p className="text-sm leading-relaxed">{selected.detail}</p>
              <dl className="text-muted-foreground grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                <div><dt>Unit</dt><dd className="text-foreground font-medium">{selected.plate}</dd></div>
                <div><dt>Waktu</dt><dd className="text-foreground font-medium">{fmtTime(selected.at)}</dd></div>
                <div><dt>Volume</dt><dd className="text-foreground font-medium">{selected.type === "SENSOR_FLATLINE" ? "—" : fmtL(selected.liters)}</dd></div>
                <div><dt>Perkiraan nilai</dt><dd className="text-foreground font-medium">{selected.type === "SENSOR_FLATLINE" ? "—" : fmtRp(selected.liters * data.priceAssumption)}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-4 text-xs">
                <a className="text-primary inline-flex items-center gap-1 underline-offset-2 hover:underline" href={osmLink(selected.lat, selected.lng)} target="_blank" rel="noreferrer">
                  <MapPin className="size-3.5" /> Lokasi di OpenStreetMap <ExternalLink className="size-3" />
                </a>
                <Link className="text-primary inline-flex items-center gap-1 underline-offset-2 hover:underline" href={`/tracking?focus=${selected.unitId}`}>
                  <Eye className="size-3.5" /> Lihat unit di peta tracking
                </Link>
              </div>

              {selected.kind === "ALERT" && (
                canWrite ? (
                  <div className="space-y-2 border-t pt-3">
                    <label htmlFor="note" className="text-xs font-medium">Catatan tinjauan</label>
                    <textarea
                      id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500}
                      placeholder="Mis. sudah konfirmasi ke driver; hasil cek fisik tangki; alasan alarm palsu…"
                      className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/25 w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:ring-4"
                    />
                    {error && <p className="flex items-center gap-1.5 text-xs text-red-600"><TriangleAlert className="size-3.5" />{error}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy} onClick={() => review("REVIEWING")} className="hover:bg-muted rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-60">Tandai ditinjau</button>
                      <button disabled={busy} onClick={() => review("CONFIRMED")} className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"><Check className="size-3.5" /> Konfirmasi kecurangan</button>
                      <button disabled={busy} onClick={() => review("DISMISSED")} className="hover:bg-muted inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-60"><X className="size-3.5" /> Alarm palsu</button>
                    </div>
                  </div>
                ) : selected.note ? (
                  <p className="text-muted-foreground border-t pt-3 text-xs">Catatan: {selected.note}</p>
                ) : null
              )}
              {!canWrite && selected.kind === "ALERT" && <p className="text-muted-foreground text-xs">Anda hanya punya akses lihat. Tinjauan dilakukan oleh owner, finance, atau fleet.</p>}
            </div>
          ) : (
            <p className="text-muted-foreground mt-4 rounded-lg border border-dashed p-4 text-center text-sm">Pilih peringatan di daftar atau titik pada grafik untuk melihat bukti dan menindaklanjuti.</p>
          )}
        </section>
      </div>

      <section className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="border-b px-4 py-3"><h2 className="text-sm font-semibold">Ringkasan per unit</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">BBM sekarang</th>
                <th className="px-4 py-2 text-right font-medium">Jarak</th>
                <th className="px-4 py-2 text-right font-medium">Konsumsi</th>
                <th className="px-4 py-2 text-right font-medium">Dugaan hilang</th>
                <th className="px-4 py-2 text-right font-medium">Peringatan</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.units.map((u) => {
                const bad = u.kmPerLiter != null && u.kmPerLiter < u.baselineKmPerLiter * 0.85;
                return (
                  <tr key={u.unitId} onClick={() => { setUnitId(u.unitId); setSelectedKey(null); }} className={cn("cursor-pointer transition", u.unitId === unitId ? "bg-primary/5" : "hover:bg-muted/50")}>
                    <td className="px-4 py-2.5"><span className="font-medium">{u.plate}</span><span className="text-muted-foreground block text-xs">{u.driver} · {u.vehicleType}</span></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="bg-muted h-2 w-24 overflow-hidden rounded-full">
                          <div className={cn("h-full rounded-full", u.levelPct < 20 ? "bg-red-500" : u.levelPct < 40 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(100, u.levelPct)}%` }} />
                        </div>
                        <span className="text-xs">{u.levelPct}% · {Math.round(u.levelLiters)} L</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">{u.distanceKm.toLocaleString("id-ID")} km</td>
                    <td className={cn("px-4 py-2.5 text-right", bad && "font-medium text-red-600")}>
                      {u.kmPerLiter ? `${u.kmPerLiter.toLocaleString("id-ID")} km/L` : "—"}
                      <span className="text-muted-foreground block text-xs">acuan {u.baselineKmPerLiter.toLocaleString("id-ID")}</span>
                    </td>
                    <td className={cn("px-4 py-2.5 text-right", u.lossLiters > 0 && "font-medium text-red-600")}>{u.lossLiters ? fmtL(u.lossLiters) : "—"}</td>
                    <td className="px-4 py-2.5 text-right">{u.openAlerts ? <Pill className="bg-red-50 text-red-700 ring-red-200">{u.openAlerts}</Pill> : <span className="text-muted-foreground">0</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
