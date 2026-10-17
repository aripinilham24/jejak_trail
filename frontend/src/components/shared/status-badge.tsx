import { useTranslation } from "react-i18next"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { statusClass } from "@/lib/status"

interface StatusBadgeProps {
  status: string
  className?: string
  icon?: React.ReactNode
  /** tampilkan titik warna */
  dot?: boolean
}

export function StatusBadge({ status, className, icon, dot = true }: StatusBadgeProps) {
  const { t } = useTranslation()
  const label = t(`status.${status}`, { defaultValue: status })

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusClass(status),
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {icon}
      {label}
    </Badge>
  )
}
