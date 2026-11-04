"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { CircleCheck, Fuel, Gauge, LocateFixed, Radio, Search, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { FleetSnapshot, FleetUnit, UnitStatus } from "./demo-fleet";

const POLL_MS = 5000;

const statusMeta: Record<UnitStatus, { label: string; color: string; ring: string }> = {
  MOVING: { label: "Bergerak", color: "#059669", ring: "rgba(5,150,105,.28)" },
  STOPPED: { label: "Berhenti", color: "#d97706", ring: "rgba(217,119,6,.28)" },
  OFFLINE: { label: "Tidak ada sinyal", color: "#64748b", ring: "rgba(100,116,139,.28)" },
};

const truckSvg =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

function pinIcon(u: FleetUnit, selected: boolean) {
  const m = statusMeta[u.status];
  const arrow =
    u.status === "MOVING"
      ? `<span style="position:absolute;inset:0;transform:rotate(${u.heading}deg)"><i style="position:absolute;left:50%;top:-7px;margin-left:-5px;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid ${m.color}"></i></span>`
      : "";
  const size = selected ? 38 : 32;
  return L.divIcon({
    className: "tms-pin",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px">${arrow}<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:9999px;background:${m.color};border:2px solid #fff;box-shadow:0 0 0 ${selected ? 6 : 4}px ${m.ring},0 2px 6px rgba(15,23,42,.35)">${truckSvg}</span></div>`,
  });
}

function popupNode(u: FleetUnit) {
  const el = document.createElement("div");
  el.className = "tms-popup";
  const rows: [string, string][] = [
    ["Status", `${statusMeta[u.status].label}${u.status === "MOVING" ? `, ${u.speedKmh} km/j` : ""}`],
    ["Driver", u.driver],
    ["Trip", u.tripNo],
    ["Rute", u.routeLabel],
    ["Customer", u.customer],
    ["Muatan", u.cargo],
    ["Update", new Date(u.lastUpdate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB"],
  ];
  if (u.fuel) rows.splice(2, 0, ["BBM", `${u.fuel.pct}% (${u.fuel.liters} L)`]);
  const title = document.createElement("div");
  title.className = "tms-popup-title";
  title.textContent = `${u.plate} · ${u.vehicleType}`;
  el.appendChild(title);
  for (const [k, v] of rows) {
    const r = document.createElement("div");
    r.className = "tms-popup-row";
    const a = document.createElement("span");
    a.textContent = k;
    const b = document.createElement("b");
    b.textContent = v; // textContent: aman dari injeksi HTML
    r.append(a, b);
    el.appendChild(r);
  }
  if (u.fuel && u.fuel.alerts > 0) {
    const link = document.createElement("a");
    link.className = "tms-popup-alert";
    link.href = `/fuel?unit=${encodeURIComponent(u.id)}`;
    link.textContent = `${u.fuel.alerts} peringatan BBM - lihat riwayat`;
    el.appendChild(link);
  }
  return el;
}

export function FleetMap({ initial, focusId }: { initial: FleetSnapshot; focusId?: string }) {
  const [snap, setSnap] = useState(initial);
  const [filter, setFilter] = useState<UnitStatus | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(() =>
    focusId && initial.units.some((u) => u.id === focusId) ? focusId : null,
  );
  const [live, setLive] = useState(true);

  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const routeLine = useRef<L.Polyline | null>(null);
  const fitted = useRef(false);
  const focused = useRef(false);
  const userMoved = useRef(false);
  const unitsRef = useRef<FleetUnit[]>(initial.units);

  // peta dibuat sekali
  useEffect(() => {
    if (!mapEl.current || map.current) return;
    const m = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([-7.2, 109.6], 7);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(m);
    m.on("click", () => setSelected(null));
    map.current = m;
    // Label plat disembunyikan saat zoom jauh agar tidak bertumpuk.
    const syncLabels = () => mapEl.current?.classList.toggle("tms-hide-labels", m.getZoom() < 7);
    m.on("zoomend", syncLabels);
    syncLabels();

    // Ukuran kontainer baru final setelah layout; hitung ulang dan pas-bingkai sampai pengguna menggeser peta sendiri.
    const el = mapEl.current;
    const touch = () => (userMoved.current = true);
    el.addEventListener("pointerdown", touch);
    el.addEventListener("wheel", touch, { passive: true });
    const ro = new ResizeObserver(() => {
      m.invalidateSize();
      if (!userMoved.current && unitsRef.current.length) {
        m.fitBounds(L.latLngBounds(unitsRef.current.map((u) => [u.lat, u.lng] as [number, number])).pad(0.25), { animate: false });
      }
    });
    ro.observe(el);

    const markerMap = markers.current;
    return () => {
      // Setel ulang penanda agar peta yang dibuat ulang (Strict Mode / remount) tetap pas-bingkai dan fokus dengan benar.
      fitted.current = false;
      focused.current = false;
      userMoved.current = false;
      ro.disconnect();
      el.removeEventListener("pointerdown", touch);
      el.removeEventListener("wheel", touch);
      m.remove();
      map.current = null;
      markerMap.clear();
    };
  }, []);

  useEffect(() => {
    unitsRef.current = snap.units;
  }, [snap.units]);

  // polling posisi terbaru
  useEffect(() => {
    if (!live) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/v1/tracking/fleet", { cache: "no-store" });
        if (r.ok && !stop) setSnap(await r.json());
      } catch {
        /* jaringan putus: pertahankan posisi terakhir */
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [live]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return snap.units.filter(
      (u) => (filter === "ALL" || u.status === filter) && (!q || `${u.plate} ${u.driver} ${u.routeLabel} ${u.tripNo}`.toLowerCase().includes(q)),
    );
  }, [snap, filter, query]);

  // sinkronkan marker dengan data
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const keep = new Set(visible.map((u) => u.id));
    for (const [id, mk] of markers.current) {
      if (!keep.has(id)) {
        mk.remove();
        markers.current.delete(id);
      }
    }
    for (const u of visible) {
      let mk = markers.current.get(u.id);
      const isSel = selected === u.id;
      if (!mk) {
        mk = L.marker([u.lat, u.lng], { icon: pinIcon(u, isSel), riseOnHover: true }).addTo(m);
        mk.bindTooltip(u.plate, { permanent: true, direction: "bottom", offset: [0, 16], className: "tms-label" });
        mk.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          setSelected(u.id);
        });
        markers.current.set(u.id, mk);
      } else {
        mk.setLatLng([u.lat, u.lng]);
        mk.setIcon(pinIcon(u, isSel));
      }
      mk.setZIndexOffset(isSel ? 1000 : 0);
      mk.unbindPopup().bindPopup(popupNode(u), { offset: [0, -14], closeButton: false });
      if (isSel && !mk.isPopupOpen()) mk.openPopup();
    }
    if (!fitted.current && visible.length) {
      m.fitBounds(L.latLngBounds(visible.map((u) => [u.lat, u.lng] as [number, number])).pad(0.25));
      fitted.current = true;
    }
  }, [visible, selected]);

  // buka langsung unit tertentu (mis. dari halaman Monitoring BBM)
  useEffect(() => {
    if (!focusId || focused.current || !map.current) return;
    const u = snap.units.find((x) => x.id === focusId);
    if (!u) return;
    focused.current = true;
    userMoved.current = true; // jangan ditimpa pas-bingkai otomatis
    map.current.flyTo([u.lat, u.lng], 10, { duration: 0.8 });
  }, [focusId, snap.units]);

  // garis rute unit terpilih
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    routeLine.current?.remove();
    routeLine.current = null;
    const u = snap.units.find((x) => x.id === selected);
    if (u) {
      routeLine.current = L.polyline(u.routePath, { color: statusMeta[u.status].color, weight: 4, opacity: 0.55, dashArray: "8 8" }).addTo(m);
    }
  }, [selected, snap.units]);

  const focusUnit = useCallback((u: FleetUnit) => {
    setSelected(u.id);
    map.current?.flyTo([u.lat, u.lng], Math.max(map.current.getZoom(), 10), { duration: 0.8 });
  }, []);

  const counts = useMemo(() => {
    const c = { MOVING: 0, STOPPED: 0, OFFLINE: 0 };
    for (const u of snap.units) c[u.status]++;
    return c;
  }, [snap]);

  return (
    <div className="grid h-full min-h-[560px] gap-4 lg:grid-cols-[340px_1fr]">
      <section className="bg-card flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm">
        <div className="space-y-3 border-b p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            {(["MOVING", "STOPPED", "OFFLINE"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(filter === s ? "ALL" : s)}
                className={cn(
                  "rounded-lg border px-2 py-2 transition",
                  filter === s ? "border-primary bg-primary/5" : "hover:bg-muted/60",
                )}
              >
                <span className="block text-xl leading-none font-semibold" style={{ color: statusMeta[s].color }}>{counts[s]}</span>
                <span className="text-muted-foreground mt-1 block text-[11px]">{statusMeta[s].label}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari plat, driver, rute…"
              className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/25 h-9 w-full rounded-lg border pr-3 pl-9 text-sm outline-none focus-visible:ring-4"
            />
          </div>
        </div>

        <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
          {visible.length === 0 && <li className="text-muted-foreground p-6 text-center text-sm">Tidak ada unit yang cocok.</li>}
          {visible.map((u) => (
            <li key={u.id}>
              <button
                onClick={() => focusUnit(u)}
                className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition", selected === u.id ? "bg-primary/5" : "hover:bg-muted/50")}
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full" style={{ background: statusMeta[u.status].color }}>
                  <Truck className="size-4 text-white" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{u.plate}</span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: statusMeta[u.status].color }}>
                      {u.status === "MOVING" ? <Gauge className="size-3.5" /> : <CircleCheck className="size-3.5 opacity-0" />}
                      {u.status === "MOVING" ? `${u.speedKmh} km/j` : statusMeta[u.status].label}
                    </span>
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">{u.driver} · {u.vehicleType}</span>
                  <span className="text-muted-foreground block truncate text-xs">{u.routeLabel}</span>
                  {u.fuel && (
                    <span className={cn("mt-0.5 flex items-center gap-1.5 text-xs", u.fuel.alerts > 0 ? "font-medium text-red-600" : "text-muted-foreground")}>
                      <Fuel className="size-3" /> BBM {u.fuel.pct}%{u.fuel.alerts > 0 ? ` · ${u.fuel.alerts} peringatan` : ""}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative min-h-[420px] overflow-hidden rounded-xl border shadow-sm">
        <div ref={mapEl} className="absolute inset-0 z-0" />
        <div className="absolute top-3 left-3 z-[500] flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <span className="bg-background/95 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm backdrop-blur">
            <span className={cn("size-2 rounded-full", live ? "animate-pulse bg-emerald-500" : "bg-slate-400")} />
            {live ? "Live" : "Dijeda"}
          </span>
          {snap.source === "DEMO" && (
            <span className="rounded-full border border-amber-300 bg-amber-50/95 px-3 py-1 text-xs font-medium text-amber-800 shadow-sm backdrop-blur">
              Data simulasi
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 z-[500] flex gap-2">
          <button
            onClick={() => setLive((v) => !v)}
            aria-label={live ? "Jeda pembaruan" : "Lanjutkan pembaruan"}
            className="bg-background/95 hover:bg-background flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
          >
            <Radio className="size-3.5" /> <span className="hidden sm:inline">{live ? "Jeda" : "Lanjut"}</span>
          </button>
          <button
            aria-label="Tampilkan semua unit"
            onClick={() => map.current?.fitBounds(L.latLngBounds(snap.units.map((u) => [u.lat, u.lng] as [number, number])).pad(0.25))}
            className="bg-background/95 hover:bg-background flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur"
          >
            <LocateFixed className="size-3.5" /> <span className="hidden sm:inline">Semua unit</span>
          </button>
        </div>
      </section>
    </div>
  );
}
