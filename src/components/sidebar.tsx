import Link from "next/link";
import { can, type Role } from "@/lib/auth/permissions";
import { masterResources } from "@/modules/master/resources";
import { LogoutButton } from "./logout-button";

export function Sidebar({ user }: { user: { name: string; role: Role } }) {
  const items = masterResources.filter((r) => can(user.role, "read", r.permission));
  return (
    <aside className="bg-muted/40 flex w-60 print:hidden shrink-0 flex-col border-r p-4">
      <Link href="/" className="mb-6 text-lg font-semibold">🚚 TMS</Link>
      <nav className="flex-1 space-y-1 text-sm">
        <Link href="/" className="hover:bg-accent block rounded px-3 py-2">Dashboard</Link>
        {can(user.role, "read", "orders") && (
          <Link href="/orders" className="hover:bg-accent block rounded px-3 py-2">Order</Link>
        )}
        {can(user.role, "read", "dispatch") && (
          <Link href="/dispatch" className="hover:bg-accent block rounded px-3 py-2">Dispatch</Link>
        )}
        {can(user.role, "read", "invoices") && (
          <Link href="/invoices" className="hover:bg-accent block rounded px-3 py-2">Invoice</Link>
        )}
        {can(user.role, "read", "payables") && (
          <Link href="/payables" className="hover:bg-accent block rounded px-3 py-2">Hutang vendor</Link>
        )}
        {can(user.role, "read", "reports") && (
          <>
            <Link href="/reports/margin" className="hover:bg-accent block rounded px-3 py-2">Laporan margin</Link>
            <Link href="/reports/aging" className="hover:bg-accent block rounded px-3 py-2">Aging</Link>
          </>
        )}
        {items.length > 0 && (
          <p className="text-muted-foreground px-3 pt-4 pb-1 text-xs uppercase">Master data</p>
        )}
        {items.map((r) => (
          <Link key={r.key} href={`/master/${r.key}`} className="hover:bg-accent block rounded px-3 py-2">
            {r.label}
          </Link>
        ))}
      </nav>
      <div className="border-t pt-3 text-sm">
        <p className="font-medium">{user.name}</p>
        <p className="text-muted-foreground mb-2 text-xs capitalize">{user.role}</p>
        <LogoutButton />
      </div>
    </aside>
  );
}
