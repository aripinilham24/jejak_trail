import { cn } from "@/lib/utils"
import { percent } from "@/lib/format"

interface QuotaBarProps {
  filled: number
  quota: number
  className?: string
  showLabels?: boolean
  size?: "sm" | "md"
}

export function QuotaBar({ filled, quota, className, showLabels = true, size = "md" }: QuotaBarProps) {
  const pct = percent(filled, quota)
  const remaining = Math.max(0, quota - filled)
  const tone =
    pct >= 100
      ? "bg-rose-500"
      : pct >= 85
        ? "bg-amber-500"
        : pct >= 55
          ? "bg-amber-400"
          : "bg-emerald-500"

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">{filled}</span> / {quota} terisi
          </span>
          <span
            className={cn(
              "font-medium",
              pct >= 100 ? "text-rose-600 dark:text-rose-300" : pct >= 85 ? "text-amber-600 dark:text-amber-300" : "text-muted-foreground",
            )}
          >
            {pct >= 100 ? "Kuota penuh" : `sisa ${remaining}`}
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted",
          size === "sm" ? "h-1.5" : "h-2",
        )}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", tone)}
          style={{ width: `${Math.max(3, pct)}%` }}
        />
      </div>
    </div>
  )
}
