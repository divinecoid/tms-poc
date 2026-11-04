"use client";

import { MapPin, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

type Pt = { lat: number; lng: number; speed?: number; ts: string };

/** Kumpulkan posisi di localStorage, kirim batch tiap 60 dtk; sisa antrean dikirim ulang saat online. */
export function GpsTracker({ tripId, active }: { tripId: string; active: boolean }) {
  const [state, setState] = useState<"off" | "ok" | "denied">("off");

  useEffect(() => {
    if (!active || !navigator.geolocation) return;
    const key = `gps:${tripId}`;
    const read = (): Pt[] => {
      try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
    };
    const write = (v: Pt[]) => {
      try { localStorage.setItem(key, JSON.stringify(v.slice(-500))); } catch {}
    };
    let last = 0;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        setState("ok");
        if (p.timestamp - last < 30_000) return;
        last = p.timestamp;
        write([...read(), {
          lat: p.coords.latitude, lng: p.coords.longitude,
          speed: p.coords.speed != null ? Math.max(0, p.coords.speed * 3.6) : undefined,
          ts: new Date(p.timestamp).toISOString(),
        }]);
      },
      (e) => setState(e.code === 1 ? "denied" : "off"),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
    const flush = async () => {
      const batch = read().slice(0, 100);
      if (!batch.length) return;
      try {
        const r = await fetch("/api/v1/tracking/ping", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ tripId, points: batch }),
        });
        if (r.ok) write(read().slice(batch.length));
      } catch {}
    };
    const timer = setInterval(flush, 60_000);
    window.addEventListener("online", flush);
    flush();
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(timer);
      window.removeEventListener("online", flush);
    };
  }, [tripId, active]);

  if (!active) return null;
  const warn = state === "denied";
  return (
    <p className={`flex items-center gap-1.5 text-xs ${warn ? "text-amber-700" : "text-muted-foreground"}`}>
      {warn ? <TriangleAlert className="size-3.5 shrink-0" /> : <MapPin className="size-3.5 shrink-0" />}
      {state === "ok" && "Lokasi aktif, dibagikan saat trip berjalan"}
      {state === "denied" && "Izin lokasi ditolak. Aktifkan lokasi agar trip bisa dilacak."}
      {state === "off" && "Menunggu sinyal lokasi…"}
    </p>
  );
}
