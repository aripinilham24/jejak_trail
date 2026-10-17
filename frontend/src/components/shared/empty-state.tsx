import type { LucideIcon } from "lucide-react"
import type React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "panel relative flex flex-col items-center gap-3 overflow-hidden rounded-xl px-6 py-12 text-center",
        className,
      )}
    >
      <div className="topo-pattern pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="relative space-y-2">
        {Icon && (
          <span className="mx-auto grid size-12 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground">
            <Icon className="size-5" />
          </span>
        )}
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {description && (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="relative">{action}</div>}
    </div>
  )
}
