"use client";

import { useMemo, useState } from "react";
import { fmtDay, fmtTime } from "./format";
import type { FuelEvent, Severity } from "./types";

type Point = [at: number, liters: number, speed: number];

const W = 820;
const H = 280;
const PAD = { l: 48, r: 14, t: 16, b: 30 };

const sevColor: Record<Severity, string> = { HIGH: "#dc2626", MEDIUM: "#d97706", LOW: "#64748b" };

export function FuelChart({
  points, tank, events, selectedKey, onSelect, hours,
}: {
  points: Point[];
  tank: number;
  events: FuelEvent[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  hours: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (points.length < 2) return null;
    const t0 = points[0][0];
    const t1 = points[points.length - 1][0];
    const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0 || 1)) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - Math.min(1, Math.max(0, v / tank))) * (H - PAD.t - PAD.b);
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join("");
    const area = `${line}L${x(t1).toFixed(1)} ${y(0)}L${x(t0).toFixed(1)} ${y(0)}Z`;

    // pita abu-abu untuk periode truk berhenti
    const stops: [number, number][] = [];
    let s: number | null = null;
    points.forEach((p, i) => {
      const still = p[2] < 3;
      if (still && s == null) s = p[0];
      if ((!still || i === points.length - 1) && s != null) {
        stops.push([s, p[0]]);
        s = null;
      }
    });

    const stepMs = hours <= 24 ? 4 * 3_600_000 : hours <= 72 ? 12 * 3_600_000 : 24 * 3_600_000;
    const ticks: number[] = [];
    const first = Math.ceil((t0 + 7 * 3_600_000) / stepMs) * stepMs - 7 * 3_600_000; // sejajar jam WIB
    for (let t = first; t <= t1; t += stepMs) ticks.push(t);
    return { t0, t1, x, y, line, area, stops, ticks, stepMs };
  }, [points, tank, hours]);

  if (!geo) return <div className="text-muted-foreground flex h-64 items-center justify-center text-sm">Belum ada data pada rentang ini.</div>;

  const levelAt = (t: number) => {
    let best = points[0];
    for (const p of points) if (Math.abs(p[0] - t) < Math.abs(best[0] - t)) best = p;
    return best[1];
  };
  const hp = hover != null ? points[hover] : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full min-w-[620px] select-none"
      role="img"
      aria-label="Grafik level BBM"
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * W;
        const t = geo.t0 + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (geo.t1 - geo.t0);
        let bi = 0;
        for (let i = 1; i < points.length; i++) if (Math.abs(points[i][0] - t) < Math.abs(points[bi][0] - t)) bi = i;
        setHover(px < PAD.l || px > W - PAD.r ? null : bi);
      }}
    >
      <defs>
        <linearGradient id="fuel-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e7490" stopOpacity="0.28" />
          <stop offset="1" stopColor="#0e7490" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={PAD.l} x2={W - PAD.r} y1={geo.y(tank * f)} y2={geo.y(tank * f)} stroke="#e2e8f0" strokeDasharray={f === 0 ? undefined : "3 4"} />
          <text x={PAD.l - 8} y={geo.y(tank * f) + 4} textAnchor="end" fontSize="11" fill="#64748b">{Math.round(tank * f)}</text>
        </g>
      ))}
      <text x={12} y={12} fontSize="10" fill="#94a3b8">liter</text>

      {geo.stops.map(([a, b], i) => (
        <rect key={i} x={geo.x(a)} y={PAD.t} width={Math.max(1, geo.x(b) - geo.x(a))} height={H - PAD.t - PAD.b} fill="#94a3b8" opacity="0.1" />
      ))}

      {geo.ticks.map((t) => (
        <g key={t}>
          <line x1={geo.x(t)} x2={geo.x(t)} y1={H - PAD.b} y2={H - PAD.b + 4} stroke="#94a3b8" />
          <text x={geo.x(t)} y={H - 10} textAnchor="middle" fontSize="11" fill="#64748b">
            {geo.stepMs >= 24 * 3_600_000 ? fmtDay(t) : `${fmtDay(t)} ${fmtTime(t, false)}`}
          </text>
        </g>
      ))}

      <path d={geo.area} fill="url(#fuel-area)" />
      <path d={geo.line} fill="none" stroke="#0e7490" strokeWidth="1.8" strokeLinejoin="round" />

      {events.map((e) => {
        if (e.at < geo.t0 || e.at > geo.t1) return null;
        const cx = geo.x(e.at);
        const cy = geo.y(levelAt(e.at));
        const sel = e.key === selectedKey;
        const color = e.kind === "INFO" ? "#059669" : sevColor[e.severity];
        return (
          <g key={e.key} className="cursor-pointer" onClick={() => onSelect(e.key)}>
            {sel && <circle cx={cx} cy={cy} r={13} fill={color} opacity="0.18" />}
            <circle cx={cx} cy={cy} r={e.kind === "INFO" ? 4.5 : 6.5} fill={color} stroke="#fff" strokeWidth="2" />
            <title>{`${e.title}, ${fmtTime(e.at)} (${Math.round(e.liters)} L)`}</title>
          </g>
        );
      })}

      {hp && (
        <g pointerEvents="none">
          <line x1={geo.x(hp[0])} x2={geo.x(hp[0])} y1={PAD.t} y2={H - PAD.b} stroke="#0f172a" strokeOpacity="0.25" />
          <circle cx={geo.x(hp[0])} cy={geo.y(hp[1])} r={4} fill="#0e7490" stroke="#fff" strokeWidth="2" />
          <g transform={`translate(${Math.min(Math.max(geo.x(hp[0]) - 70, PAD.l), W - PAD.r - 140)} ${PAD.t + 2})`}>
            <rect width="140" height="38" rx="6" fill="#0f172a" opacity="0.92" />
            <text x="8" y="16" fontSize="11" fill="#fff" fontWeight="600">{fmtTime(hp[0])} · {hp[1].toFixed(1)} L</text>
            <text x="8" y="30" fontSize="10" fill="#cbd5e1">{hp[2] < 3 ? "Berhenti" : `${hp[2]} km/j`}</text>
          </g>
        </g>
      )}
    </svg>
  );
}
