import { cn } from "@/lib/utils"

interface BrandProps {
  className?: string
  showWordmark?: boolean
  size?: "sm" | "md" | "lg"
}

const SIZES = {
  sm: { box: "size-8", text: "text-base", sub: "text-[9px]" },
  md: { box: "size-9", text: "text-lg", sub: "text-[10px]" },
  lg: { box: "size-11", text: "text-2xl", sub: "text-[11px]" },
}

export function Brand({ className, showWordmark = true, size = "md" }: BrandProps) {
  const s = SIZES[size]
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#0f2a1d] to-[#071410] shadow-[0_10px_24px_-14px_rgba(245,165,36,0.75)]",
          s.box,
        )}
      >
        <svg viewBox="0 0 32 32" className="size-[70%]" aria-hidden>
          <defs>
            <linearGradient id="brand-sun" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd479" />
              <stop offset="100%" stopColor="#f5a524" />
            </linearGradient>
          </defs>
          <circle cx="22" cy="10" r="4.2" fill="url(#brand-sun)" />
          <path d="M2 24 L11 12 L16.5 19.5 L20.5 15 L30 24 Z" fill="#0f2a1d" stroke="#3f7a55" strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M2 27 C8 24.5 14 26.5 20 23.5 C25 21 27.5 22.5 30 22.5" stroke="#f5a524" strokeWidth="1.1" fill="none" strokeDasharray="2 2" strokeLinecap="round" />
        </svg>
      </span>
      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display font-semibold tracking-tight", s.text)}>
            Jejak<span className="text-amber-500 dark:text-amber-400">Trail</span>
          </span>
          <span className={cn("font-mono uppercase tracking-[0.22em] text-muted-foreground", s.sub)}>
            Trail Run Platform
          </span>
        </span>
      )}
    </span>
  )
}
