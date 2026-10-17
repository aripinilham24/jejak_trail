import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { EventRoutePoint } from "@/types"
import { cn } from "@/lib/utils"

interface ElevationChartProps {
  points: EventRoutePoint[]
  className?: string
  height?: number
}

export function ElevationChart({ points, className, height = 180 }: ElevationChartProps) {
  const data = useMemo(() => points, [points])

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-lg border border-dashed border-border text-sm text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        Profil elevasi belum tersedia
      </div>
    )
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="elevationFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="km"
            tickFormatter={(value: number) => `${value}k`}
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="elevation"
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}`}
            domain={["dataMin - 60", "dataMax + 80"]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            content={({ payload, label }) => {
              if (!payload || !payload.length) return null;
              return (
                <div className="rounded-lg border border-border bg-popover p-2 shadow-md">
                  <p className="font-mono text-xs text-muted-foreground">KM {label}</p>
                  <p className="font-medium text-sm">Elevasi: {(payload[0].value as number) ?? 0} m</p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="elevation"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#elevationFill)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
