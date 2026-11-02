"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setPending(false);
    if (error) return setError("Email atau password salah");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>🚚 Masuk ke TMS</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="username" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Masuk…" : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
