import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  // Gradien lewat CSS (bukan <linearGradient id>) agar tetap benar saat ada beberapa logo di satu halaman.
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#0f3a5f] to-[#0e7490] shadow-sm ring-1 ring-white/10",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="size-full">
        <path d="M9 10.5h14M16 10.5v10" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="16" cy="23" r="2.3" fill="#5eead4" />
      </svg>
    </span>
  );
}

export function Logo({
  tone = "dark",
  caption,
  className,
}: {
  tone?: "dark" | "light";
  caption?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex flex-col leading-none">
        <span className={cn("text-[15px] font-semibold tracking-[0.14em]", tone === "light" ? "text-white" : "text-foreground")}>
          TMS
        </span>
        {caption && (
          <span className={cn("mt-1 text-[10px] tracking-wide", tone === "light" ? "text-slate-400" : "text-muted-foreground")}>
            {caption}
          </span>
        )}
      </span>
    </span>
  );
}
