"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export function LogoutButton({ tone = "light" }: { tone?: "light" | "dark" }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      title="Keluar"
      aria-label="Keluar"
      className={cn(tone === "dark" && "text-slate-400 hover:bg-white/10 hover:text-white")}
      onClick={async () => {
        await authClient.signOut();
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="size-4" />
    </Button>
  );
}
