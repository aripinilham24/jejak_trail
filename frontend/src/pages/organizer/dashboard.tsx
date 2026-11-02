import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { CheckCircle, CreditCard, DollarSign, Loader2, Users } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { useOrganizerDashboard } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort, formatIDR } from "@/lib/format"

export function OrganizerDashboardPage() {
  const { t } = useTranslation()
  const query = useOrganizerDashboard()
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
    { label: t("organizer.collected"), value: formatIDR(data.money.collected), icon: DollarSign },
    { label: t("organizer.disbursed"), value: formatIDR(data.money.disbursed), icon: CreditCard },
    { label: t("organizer.held"), value: formatIDR(data.money.held), icon: CheckCircle },
    { label: "Peserta lunas", value: String(data.paidRegistrations), icon: Users },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading>{t("organizer.title")}</Heading>
        <Button asChild variant="outline">
          <Link to="/organizer/verifications">
            {data.pendingVerifications} menunggu verifikasi
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kuota per kategori</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.registrationsByCategory.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada kategori.</p>
            )}
            {data.registrationsByCategory.map((item) => {
              const percent = item.kuota > 0 ? Math.min(100, (item.terisi / item.kuota) * 100) : 0
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate">{item.category}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.terisi}/{item.kuota}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rekap jersey</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.jerseyRecap.length === 0 && (
              <p className="text-muted-foreground">Belum ada jawaban ukuran jersey.</p>
            )}
            {data.jerseyRecap.map((item) => (
              <div key={item.size} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span>{item.size}</span>
                <span className="font-mono">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tren pendaftaran 30 hari</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Tanggal</th>
                  <th className="pb-2 font-medium">Pendaftar</th>
                  <th className="pb-2 font-medium">Lunas</th>
                </tr>
              </thead>
              <tbody>
                {data.registrationTrend.map((row) => (
                  <tr key={row.date} className="border-t border-border/60">
                    <td className="py-2">{formatDateShort(row.date)}</td>
                    <td className="py-2 font-mono">{row.pendaftar}</td>
                    <td className="py-2 font-mono">{row.lunas}</td>
                  </tr>
                ))}
                {data.registrationTrend.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-muted-foreground">
                      Belum ada pendaftaran dalam 30 hari terakhir.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
