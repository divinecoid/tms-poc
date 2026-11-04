import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { requireUser } from "@/lib/auth/session";

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.role === "driver") redirect("/driver");
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 overflow-x-auto bg-slate-50 p-8">{children}</main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
