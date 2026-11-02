import { useTranslation } from "react-i18next"
import { CheckCircle, CreditCard, DollarSign, Loader2, Wallet } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatCard } from "@/components/shared/stat-card"
import { useOrganizerDisbursements, useOrganizerFinance } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort, formatIDR } from "@/lib/format"

export function OrganizerFinancePage() {
  const { t } = useTranslation()
  const summary = useOrganizerFinance()
  const disbursements = useOrganizerDisbursements()

  if (summary.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-500" />
      </div>
    )
  }

  if (summary.isError || !summary.data) {
    return (
      <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {summary.isError ? errorMessage(summary.error) : "Data keuangan tidak tersedia."}
      </p>
    )
  }

  const data = summary.data

  return (
    <div className="space-y-6">
      <Heading>{t("organizer.finance")}</Heading>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("organizer.collected")} value={formatIDR(data.collected)} icon={DollarSign} />
        <StatCard label="Refund" value={formatIDR(data.refunded)} icon={Wallet} />
        <StatCard label={t("organizer.disbursed")} value={formatIDR(data.disbursed)} icon={CreditCard} />
        <StatCard label={t("organizer.held")} value={formatIDR(data.held)} icon={CheckCircle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat pencairan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Tahap</th>
                  <th className="pb-2 font-medium">Nominal</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Rekening</th>
                  <th className="pb-2 font-medium">Payout</th>
                  <th className="pb-2 font-medium">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {(disbursements.data?.data ?? []).map((item) => (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="py-2">{item.eventTitle}</td>
                    <td className="py-2">Tahap {item.stage}</td>
                    <td className="py-2">{formatIDR(item.amount)}</td>
                    <td className="py-2"><Badge variant="outline">{item.status}</Badge></td>
                    <td className="py-2 text-xs">
                      {item.bankName ? `${item.bankName} ****${item.accountNumberLast4 ?? ""}` : "-"}
                    </td>
                    <td className="py-2 font-mono text-xs">{item.payoutRef ?? "-"}</td>
                    <td className="py-2 text-muted-foreground">
                      {item.paidAt ? formatDateShort(item.paidAt) : item.createdAt ? formatDateShort(item.createdAt) : "-"}
                    </td>
                  </tr>
                ))}
                {(disbursements.data?.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      Belum ada pencairan.
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
