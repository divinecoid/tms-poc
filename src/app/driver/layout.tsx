import type { Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LogoutButton } from "@/components/logout-button";
import { requireUser } from "@/lib/auth/session";

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#111111" };

async function Shell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="mx-auto min-h-screen max-w-md">
      <header className="bg-background sticky top-0 z-10 flex items-center justify-between border-b px-4 py-3">
        <Link href="/driver" className="font-semibold">🚚 TMS Driver</Link>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="space-y-4 p-4">{children}</main>
    </div>
  );
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}><Shell>{children}</Shell></Suspense>;
}
