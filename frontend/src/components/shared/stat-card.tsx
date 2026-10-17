import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: LucideIcon
  trend?: { value: string; positive?: boolean }
  accent?: "amber" | "emerald" | "sky" | "violet" | "rose"
  className?: string
}

const ACCENT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  amber: "from-amber-400/20 text-amber-600 dark:text-amber-300",
  emerald: "from-emerald-400/20 text-emerald-600 dark:text-emerald-300",
  sky: "from-sky-400/20 text-sky-600 dark:text-sky-300",
  violet: "from-violet-400/20 text-violet-600 dark:text-violet-300",
  rose: "from-rose-400/20 text-rose-600 dark:text-rose-300",
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  accent = "amber",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "panel relative overflow-hidden rounded-xl p-4 sm:p-5",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-gradient-to-b to-transparent blur-2xl",
          ACCENT[accent],
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">
            {value}
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-background/60",
              ACCENT[accent],
            )}
          >
            <Icon className="size-5" />
          </span>
        )}
      </div>
      {trend && (
        <p
          className={cn(
            "relative mt-3 text-xs font-medium",
            trend.positive ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300",
          )}
        >
          {trend.value}
        </p>
      )}
    </div>
  )
}
