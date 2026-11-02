import { useTranslation } from "react-i18next"
import { AlertCircle, CalendarDays, CreditCard, DollarSign, Loader2, Users } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { useAdminDashboard } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatIDR } from "@/lib/format"

export function AdminDashboardPage() {
  const { t } = useTranslation()
  const query = useAdminDashboard()
  const data = query.data

  if (query.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-500" />
      </div>
    )
  }

  if (query.isError || !data) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {query.isError ? errorMessage(query.error) : "Data dashboard tidak tersedia."}
      </p>
    )
  }

  const stats = [
    { label: t("admin.gmv"), value: formatIDR(data.gmv), icon: DollarSign },
    { label: t("admin.platformRevenue"), value: formatIDR(data.platformRevenue), icon: CreditCard },
    { label: "Total event", value: String(data.totalEvents), icon: CalendarDays },
    { label: "Total pendaftaran", value: String(data.totalRegistrations), icon: Users },
    { label: t("admin.pendingOrgs"), value: String(data.pendingOrganizations), icon: AlertCircle },
    { label: t("admin.pendingEvents"), value: String(data.pendingEvents), icon: AlertCircle },
  ]

  return (
    <div className="space-y-6">
      <Heading>{t("admin.title")}</Heading>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Komposisi event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.eventMix.map((item) => (
              <div key={item.name} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-mono">{item.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 text-sm">
              <span className="text-muted-foreground">Sengketa terbuka</span>
              <Badge variant="outline">{data.openDisputes}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pertumbuhan 6 bulan</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Bulan</th>
                  <th className="pb-2 font-medium">Pengguna</th>
                  <th className="pb-2 font-medium">Pendaftaran</th>
                  <th className="pb-2 font-medium">GMV</th>
                </tr>
              </thead>
              <tbody>
                {data.growth.map((row) => (
                  <tr key={row.month} className="border-t border-border/60">
                    <td className="py-2">{row.month}</td>
                    <td className="py-2 font-mono">{row.users}</td>
                    <td className="py-2 font-mono">{row.registrations}</td>
                    <td className="py-2">{formatIDR(row.gmv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
