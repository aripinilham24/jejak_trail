import type React from "react"
import { cn } from "@/lib/utils"

interface SectionHeadingProps {
  eyebrow?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  align?: "left" | "center"
  actions?: React.ReactNode
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "left",
  actions,
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        align === "center" && "sm:flex-col sm:items-center sm:text-center",
        className,
      )}
    >
      <div className={cn("space-y-2", align === "center" && "mx-auto max-w-2xl")}>
        {eyebrow && (
          <p className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
            <span className="inline-block h-px w-6 bg-amber-500/60" />
            {eyebrow}
          </p>
        )}
        <h2 className="text-balance-pretty font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
