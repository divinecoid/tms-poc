"use client";

import {
  Building2, ClipboardList, FileText, Handshake, Hourglass, IdCard, LayoutDashboard, MapPin, Route,
  MapPinned, TrendingUp, Truck, Wallet, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Ikon dipilih lewat nama karena komponen fungsi tidak bisa dilempar dari Server Component ke Client Component.
const icons: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, orders: ClipboardList, dispatch: Route, invoices: FileText, payables: Wallet,
  margin: TrendingUp, aging: Hourglass, customers: Building2, locations: MapPin, vehicles: Truck,
  drivers: IdCard, vendors: Handshake, tracking: MapPinned,
};

export function NavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
  const Icon = icons[icon] ?? LayoutDashboard;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition-colors",
        active ? "bg-white/10 font-medium text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-100",
      )}
    >
      <Icon className={cn("size-[17px] shrink-0", active ? "text-teal-300" : "text-slate-500 group-hover:text-slate-300")} strokeWidth={1.75} />
      {label}
    </Link>
  );
}
