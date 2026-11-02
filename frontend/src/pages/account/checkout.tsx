import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { CalendarDays, CreditCard, Loader2, MapPin, Ticket } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Countdown } from "@/components/shared/countdown"
import { StatusBadge } from "@/components/shared/status-badge"
import { useMyRegistration, useSimulateExpire, useSimulatePaid } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateTime, formatIDR } from "@/lib/format"

export function AccountCheckoutPage() {
  const { id } = useParams()
  const query = useMyRegistration(id)
  const simulatePaid = useSimulatePaid()
  const simulateExpire = useSimulateExpire()
  const reg = query.data
  const payment = reg?.payment

  async function handlePaid() {
    if (!payment) return
    try {
      await simulatePaid.mutateAsync(payment.orderId)
      toast.success("Pembayaran berhasil disimulasikan")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function handleExpire() {
    if (!payment) return
    try {
      await simulateExpire.mutateAsync(payment.orderId)
      toast.success("Kedaluwarsa pembayaran disimulasikan")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!reg) {
    return (
      <>
        <Heading className="mb-6">Pembayaran tidak ditemukan</Heading>
        <p className="text-muted-foreground">
          {query.isError ? errorMessage(query.error) : "Data pendaftaran tidak tersedia."}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/account/registrations">Kembali ke pendaftaran</Link>
        </Button>
      </>
    )
  }

  const paid = reg.status === "paid" || reg.status === "checked_in"

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Heading>Pembayaran · {reg.event?.title ?? "Event"}</Heading>
        <Button variant="outline" asChild>
          <Link to={`/account/registrations/${reg.id}`}>Detail pendaftaran</Link>
        </Button>
      </div>

      <Card className="mx-auto max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            Rincian tagihan
            <StatusBadge status={payment?.status ?? "pending"} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <CalendarDays className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tanggal event</p>
                <p className="text-sm font-medium">
                  {reg.event?.eventStartAt ? formatDateTime(reg.event.eventStartAt) : "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Lokasi</p>
                <p className="text-sm font-medium">{reg.event?.locationName ?? "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Ticket className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Kategori</p>
                <p className="text-sm font-medium">{reg.category?.name ?? "-"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="size-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Metode</p>
                <p className="text-sm font-medium uppercase">{payment?.method ?? "VA"}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-xs">{payment?.orderId ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Harga kategori</span>
              <span>{formatIDR(reg.category?.price ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Biaya platform</span>
              <span>{formatIDR(payment?.platformFee ?? 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Biaya gateway</span>
              <span>{formatIDR(payment?.gatewayFee ?? 0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold">
              <span>Total dibayar</span>
              <span>{formatIDR(payment?.amount ?? reg.category?.price ?? 0)}</span>
            </div>
          </div>

          {reg.status === "awaiting_payment" && reg.paymentDeadlineAt && (
            <Countdown target={reg.paymentDeadlineAt} label="Batas pembayaran" />
          )}

          {paid && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">Pembayaran lunas</p>
              <p className="mt-1 text-muted-foreground">
                BIB Anda <span className="font-mono font-semibold">{reg.bibNumber}</span>. Data sudah terkunci.
              </p>
              {reg.ticket && (
                <Button asChild size="sm" className="mt-3">
                  <Link to={`/account/tickets/${reg.ticket.id}`}>Lihat tiket QR</Link>
                </Button>
              )}
            </div>
          )}

          {reg.status === "expired" && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Tagihan sudah kedaluwarsa. Slot telah dilepas.
            </p>
          )}

          {reg.status === "pending_verification" && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
              Pendaftaran masih menunggu verifikasi organizer. Tagihan dibuat setelah disetujui.
            </p>
          )}

          {reg.status === "waitlisted" && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
              Anda berada di daftar tunggu posisi #{reg.waitlistPosition ?? "-"}. Pembayaran dibuka saat slot tersedia.
            </p>
          )}

          <p className="rounded-lg border border-border bg-surface-2/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
            Kebijakan refund: {reg.refundPolicyId ? "sesuai kebijakan event yang disetujui saat pendaftaran" : "tidak ada kebijakan refund"}.
            Pembayaran pada milestone ini memakai gateway mock untuk pengujian.
          </p>
        </CardContent>
        <CardFooter className="flex flex-wrap justify-end gap-2">
          {reg.status === "awaiting_payment" && payment && (
            <>
              <Button
                variant="outline"
                disabled={simulateExpire.isPending}
                onClick={() => void handleExpire()}
              >
                {simulateExpire.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Simulasikan kedaluwarsa
              </Button>
              <Button disabled={simulatePaid.isPending} onClick={() => void handlePaid()}>
                {simulatePaid.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Simulasikan pembayaran berhasil
              </Button>
            </>
          )}
          {paid && reg.ticket && (
            <Button asChild>
              <Link to={`/account/tickets/${reg.ticket.id}`}>
                <Ticket className="mr-2 size-4" />
                Buka tiket
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  )
}
