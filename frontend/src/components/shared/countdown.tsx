import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCountdown } from "@/lib/format"

interface CountdownProps {
  target: string
  className?: string
  label?: string
  compact?: boolean
}

export function Countdown({ target, className, label, compact }: CountdownProps) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setTick((t) => t + 1), 30_000)
    return () => window.clearInterval(interval)
  }, [])

  const value = formatCountdown(target)
  const expired = value === "Kedaluwarsa"

  if (compact) {
    return (
      <span className={cn("text-xs font-medium", expired ? "text-rose-600 dark:text-rose-300" : "text-amber-600 dark:text-amber-300", className)}>
        {value}
      </span>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm",
        expired && "border-rose-400/40 bg-rose-400/10",
        className,
      )}
    >
      <Clock className={cn("size-4", expired ? "text-rose-600 dark:text-rose-300" : "text-amber-600 dark:text-amber-300")} />
      <div className="min-w-0">
        {label && <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>}
        <p className={cn("font-mono text-sm font-medium", expired ? "text-rose-600 dark:text-rose-300" : "text-amber-700 dark:text-amber-200")}>
          {value}
        </p>
      </div>
    </div>
  )
}
