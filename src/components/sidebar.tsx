import { can, type Role } from "@/lib/auth/permissions";
import { masterResources } from "@/modules/master/resources";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";
import { NavLink } from "./nav-link";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[11px] font-medium tracking-[0.12em] text-slate-500 uppercase">{title}</p>
      {children}
    </div>
  );
}

export function Sidebar({ user }: { user: { name: string; role: Role } }) {
  const master = masterResources.filter((r) => can(user.role, "read", r.permission));
  const operations = [
    can(user.role, "read", "orders") && { href: "/orders", label: "Order", icon: "orders" },
    can(user.role, "read", "dispatch") && { href: "/dispatch", label: "Dispatch", icon: "dispatch" },
    can(user.role, "read", "dispatch") && { href: "/tracking", label: "Tracking armada", icon: "tracking" },
  ].filter(Boolean) as { href: string; label: string; icon: string }[];
  const finance = [
    can(user.role, "read", "invoices") && { href: "/invoices", label: "Invoice", icon: "invoices" },
    can(user.role, "read", "payables") && { href: "/payables", label: "Hutang vendor", icon: "payables" },
    can(user.role, "read", "reports") && { href: "/reports/margin", label: "Laporan margin", icon: "margin" },
    can(user.role, "read", "reports") && { href: "/reports/aging", label: "Aging", icon: "aging" },
  ].filter(Boolean) as { href: string; label: string; icon: string }[];
  const initials = user.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-[#0b1626] text-slate-200 print:hidden">
      <div className="px-5 pt-6 pb-5">
        <Logo tone="light" caption="Transport Management" />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        <NavLink href="/" label="Dashboard" icon="dashboard" />
        {operations.length > 0 && (
          <Section title="Operasional">{operations.map((i) => <NavLink key={i.href} {...i} />)}</Section>
        )}
        {finance.length > 0 && (
          <Section title="Keuangan">{finance.map((i) => <NavLink key={i.href} {...i} />)}</Section>
        )}
        {master.length > 0 && (
          <Section title="Master data">
            {master.map((r) => <NavLink key={r.key} href={`/master/${r.key}`} label={r.label} icon={r.key} />)}
          </Section>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-700 to-teal-600 text-xs font-semibold text-white">
            {initials || "U"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">{user.name}</span>
            <span className="block text-xs text-slate-400 capitalize">{user.role}</span>
          </span>
          <LogoutButton tone="dark" />
        </div>
      </div>
    </aside>
  );
}
