import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
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
import { useAdminRefunds, useCreateRefund } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateTime, formatIDR } from "@/lib/format"

const REASONS = [
  { value: "participant_cancel", label: "Peserta membatalkan" },
  { value: "event_cancelled", label: "Event dibatalkan" },
  { value: "payment_error", label: "Kesalahan pembayaran" },
  { value: "overbooked", label: "Overbooked" },
  { value: "other", label: "Lainnya" },
]

export function AdminRefundsPage() {
  const { t } = useTranslation()
  const refunds = useAdminRefunds()
  const createRefund = useCreateRefund()

  const [registrationId, setRegistrationId] = useState("")
  const [reasonType, setReasonType] = useState("participant_cancel")
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!registrationId.trim()) {
      toast.error("Registration ID wajib diisi")
      return
    }
    try {
      const result = await createRefund.mutateAsync({
        registrationId: registrationId.trim(),
        reasonType,
        amount: amount ? Number(amount) : undefined,
        note,
      })
      toast.success(`Refund ${formatIDR(result.amount)} diproses`)
      setRegistrationId("")
      setAmount("")
      setNote("")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <Heading>{t("admin.refunds")}</Heading>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Proses refund</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="registrationId">Registration ID</Label>
              <Input
                id="registrationId"
                value={registrationId}
                onChange={(e) => setRegistrationId(e.target.value)}
                placeholder="UUID pendaftaran peserta"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Alasan</Label>
              <Select value={reasonType} onValueChange={setReasonType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Nominal (kosongkan = sesuai kebijakan)</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Opsional"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="note">Catatan</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createRefund.isPending}>
                Proses refund
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat refund</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Peserta</th>
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Nominal</th>
                  <th className="pb-2 font-medium">Alasan</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Diproses</th>
                </tr>
              </thead>
              <tbody>
                {(refunds.data?.data ?? []).map((item) => (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="py-2">{item.participantName}</td>
                    <td className="py-2">{item.eventTitle}</td>
                    <td className="py-2">{formatIDR(item.amount)}</td>
                    <td className="py-2">{item.reasonType}</td>
                    <td className="py-2"><Badge variant="outline">{item.status}</Badge></td>
                    <td className="py-2 text-muted-foreground">
                      {item.processedAt ? formatDateTime(item.processedAt) : "-"}
                    </td>
                  </tr>
                ))}
                {(refunds.data?.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      Belum ada refund.
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
