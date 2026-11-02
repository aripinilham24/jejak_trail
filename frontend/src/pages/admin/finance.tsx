import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { CheckCircle, CreditCard, DollarSign, Wallet } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StatCard } from "@/components/shared/stat-card"
import {
  useAdminDisbursements,
  useAdminEvents,
  useAdminFinance,
  useCreateDisbursement,
  useReviewDisbursement,
} from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort, formatIDR } from "@/lib/format"

export function AdminFinancePage() {
  const { t } = useTranslation()
  const summary = useAdminFinance()
  const disbursements = useAdminDisbursements()
  const events = useAdminEvents({ limit: 100 })
  const createDisbursement = useCreateDisbursement()
  const review = useReviewDisbursement()

  const [eventId, setEventId] = useState("")
  const [stage, setStage] = useState("1")
  const [percentage, setPercentage] = useState("10")
  const [note, setNote] = useState("")

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!eventId) return
    try {
      await createDisbursement.mutateAsync({
        eventId,
        stage: Number(stage),
        percentage: Number(percentage),
        note,
      })
      toast.success("Pencairan dibuat")
      setNote("")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function handleReview(id: string, approve: boolean) {
    try {
      await review.mutateAsync({ id, approve })
      toast.success(approve ? "Pencairan disetujui" : "Pencairan ditahan")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const money = summary.data

  return (
    <div className="space-y-6">
      <Heading>{t("admin.finance")}</Heading>

      {money && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="GMV" value={formatIDR(money.gmv)} icon={DollarSign} />
          <StatCard label="Pendapatan platform" value={formatIDR(money.platformRevenue)} icon={CreditCard} />
          <StatCard label="Refund" value={formatIDR(money.refunded)} icon={Wallet} />
          <StatCard label="Sudah dicairkan" value={formatIDR(money.disbursed)} icon={CheckCircle} />
          <StatCard label="Dana ditahan" value={formatIDR(money.held)} icon={Wallet} />
          <StatCard label="Pencairan pending" value={String(money.pendingDisbursements)} icon={CheckCircle} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buat pencairan bertahap</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-4" onSubmit={handleCreate}>
            <div className="grid gap-2 sm:col-span-2">
              <Label>Event</Label>
              <Select value={eventId} onValueChange={setEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih event" />
                </SelectTrigger>
                <SelectContent>
                  {(events.data?.data ?? [])
                    .filter((event) => event.organizationId)
                    .map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Stage</Label>
              <Select value={stage} onValueChange={setStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tahap 1</SelectItem>
                  <SelectItem value="2">Tahap 2</SelectItem>
                  <SelectItem value="3">Tahap 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Persentase</Label>
              <Input type="number" min={1} max={100} value={percentage} onChange={(e) => setPercentage(e.target.value)} />
            </div>
            <div className="grid gap-2 sm:col-span-3">
              <Label>Catatan</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={createDisbursement.isPending || !eventId}>
                Buat pencairan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pencairan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Organisasi</th>
                  <th className="pb-2 font-medium">Tahap</th>
                  <th className="pb-2 font-medium">Nominal</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Dibuat</th>
                  <th className="pb-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(disbursements.data?.data ?? []).map((item) => (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="py-2">{item.eventTitle}</td>
                    <td className="py-2">{item.organizationName ?? "-"}</td>
                    <td className="py-2">Tahap {item.stage}</td>
                    <td className="py-2">{formatIDR(item.amount)}</td>
                    <td className="py-2"><Badge variant="outline">{item.status}</Badge></td>
                    <td className="py-2 text-muted-foreground">{formatDateShort(item.createdAt)}</td>
                    <td className="py-2">
                      {item.status === "eligible" && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => void handleReview(item.id, false)}>
                            Tahan
                          </Button>
                          <Button size="sm" onClick={() => void handleReview(item.id, true)}>
                            Setujui
                          </Button>
                        </div>
                      )}
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
