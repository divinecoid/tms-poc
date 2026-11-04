"use client";

import { ArrowRight, ChartColumn, CircleAlert, Eye, EyeOff, LoaderCircle, Lock, Mail, ReceiptText, Route } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { authClient } from "@/lib/auth/client";

const highlights = [
  { icon: Route, title: "Dispatch & pelacakan", text: "Armada sendiri dan vendor, dari order sampai bukti terima." },
  { icon: ReceiptText, title: "Keuangan terkendali", text: "Invoice, uang jalan, dan hutang vendor dalam satu alur." },
  { icon: ChartColumn, title: "Margin yang jelas", text: "Laba per order dan customer, termasuk muatan LTL." },
];

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [show, setShow] = useState(false);

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
    if (error) return setError(error.status === 429 ? "Terlalu banyak percobaan. Coba lagi sebentar." : "Email atau password salah");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <aside
        className="relative hidden flex-col justify-between overflow-hidden bg-[#06101d] bg-cover bg-center p-12 text-white lg:flex"
        style={{ backgroundImage: "url(/login-bg.svg)" }}
      >
        {/* lapisan gelap agar teks tetap terbaca di atas garis rute */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#06101d]/90 via-[#06101d]/55 to-transparent" />

        <Logo tone="light" caption="Transportation Management System" className="relative" />

        <div className="relative max-w-lg">
          <h2 className="text-4xl leading-[1.15] font-semibold tracking-tight text-balance">
            Seluruh operasi trucking Anda, dalam satu layar.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300/90">
            Dari order masuk hingga invoice terbayar, setiap armada, trip, dan rupiah tercatat dan terlacak.
          </p>
          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.07] ring-1 ring-white/15 backdrop-blur-sm">
                  <Icon className="size-[18px] text-teal-300" strokeWidth={1.75} />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white">{title}</span>
                  <span className="block text-sm text-slate-400">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-slate-500">Akses khusus pengguna terdaftar.</p>
      </aside>

      <main className="bg-background relative flex flex-col lg:items-center lg:justify-center">
        <div
          className="relative flex h-44 items-end bg-[#06101d] bg-cover bg-center p-6 lg:hidden"
          style={{ backgroundImage: "url(/login-bg.svg)" }}
        >
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#06101d]/70 to-transparent" />
          <Logo tone="light" caption="Transportation Management System" className="relative" />
        </div>

        <div className="w-full max-w-[380px] self-center px-6 py-10 lg:py-12">
          <h1 className="text-[28px] font-semibold tracking-tight">Selamat datang</h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Masuk ke akun Anda untuk melanjutkan.</p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate={false}>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                <input
                  id="email" name="email" type="email" required autoComplete="username" autoFocus
                  placeholder="nama@perusahaan.com"
                  className="border-input bg-background placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/25 h-11 w-full rounded-lg border pr-3 pl-10 text-sm transition outline-none focus-visible:ring-4"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2" />
                <input
                  id="password" name="password" type={show ? "text" : "password"} required autoComplete="current-password"
                  placeholder="Masukkan password"
                  className="border-input bg-background placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-ring/25 h-11 w-full rounded-lg border pr-11 pl-10 text-sm transition outline-none focus-visible:ring-4"
                />
                <button
                  type="button" onClick={() => setShow((v) => !v)} tabIndex={-1}
                  aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 transition"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="border-destructive/25 bg-destructive/5 text-destructive flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm">
                <CircleAlert className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit" disabled={pending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/30 group flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium shadow-sm transition outline-none focus-visible:ring-4 disabled:opacity-70"
            >
              {pending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" /> Memverifikasi…
                </>
              ) : (
                <>
                  Masuk <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="text-muted-foreground mt-10 text-center text-xs">
            Lupa password? Hubungi administrator perusahaan Anda.
          </p>
        </div>
      </main>
    </div>
  );
}
