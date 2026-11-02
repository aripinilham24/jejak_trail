import { Link, useParams } from "react-router-dom"
import { CalendarDays, CreditCard, Loader2, MapPin, Ticket } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { useMyRegistration } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateTime, formatIDR } from "@/lib/format"

export function AccountRegistrationDetailPage() {
  const { id } = useParams()
  const query = useMyRegistration(id)
  const reg = query.data

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
        <Heading className="mb-6">Pendaftaran tidak ditemukan</Heading>
        <p className="text-muted-foreground">
          {query.isError ? errorMessage(query.error) : "Data pendaftaran tidak tersedia."}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/account/registrations">Kembali ke pendaftaran</Link>
        </Button>
      </>
    )
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Heading>
          Pendaftaran {reg.event?.title ?? "Event"}
        </Heading>
        <Button variant="outline" asChild>
          <Link to="/account/registrations">Kembali ke pendaftaran</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informasi event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Tanggal event</span>
                <span className="text-sm text-muted-foreground">
                  {reg.event?.eventStartAt ? formatDateTime(reg.event.eventStartAt) : "-"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Lokasi</span>
                <span className="text-sm text-muted-foreground">
                  {reg.event?.locationName ?? "-"}, {reg.event?.city ?? "-"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Kategori</span>
                <span className="text-sm text-muted-foreground">
                  {reg.category?.name ?? "-"} · {reg.category?.distanceKm ?? "-"} km
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Harga</span>
                <span className="text-sm text-muted-foreground">
                  {reg.category?.price ? formatIDR(reg.category.price) : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Info pendaftaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Status</span>
              <StatusBadge status={reg.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pembayaran</span>
              <StatusBadge status={reg.payment?.status ?? "pending"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Dikirim</span>
              <span className="text-sm text-muted-foreground">
                {reg.submittedAt ? formatDateTime(reg.submittedAt) : "-"}
              </span>
            </div>
            {reg.paymentDeadlineAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Batas pembayaran</span>
                <span className="text-sm text-muted-foreground">{formatDateTime(reg.paymentDeadlineAt)}</span>
              </div>
            )}
            {reg.waitlistPosition != null && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Posisi waitlist</span>
                <Badge variant="outline">#{reg.waitlistPosition}</Badge>
              </div>
            )}
            {reg.rejectionReason && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Ditolak: {reg.rejectionReason}
              </p>
            )}
            {reg.status === "awaiting_payment" && (
              <Button asChild className="w-full">
                <Link to={`/account/checkout/${reg.id}`}>Lanjut ke pembayaran</Link>
              </Button>
            )}
            {reg.ticket && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                <p className="font-medium text-emerald-700 dark:text-emerald-300">
                  Tiket terbit · BIB {reg.bibNumber}
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link to={`/account/tickets/${reg.ticket.id}`}>Buka tiket QR</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data peserta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nama</span>
              <span>{reg.fullNameSnapshot}</span>
            </div>
            {reg.birthDateSnapshot && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal lahir</span>
                <span>{reg.birthDateSnapshot}</span>
              </div>
            )}
            {reg.answers.map((answer) => (
              <div key={answer.id} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{answer.fieldLabel}</span>
                <span className="text-right">{answer.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kualifikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reg.qualificationSubmissions.length === 0 && (
              <p className="text-sm text-muted-foreground">Tidak ada dokumen kualifikasi.</p>
            )}
            {reg.qualificationSubmissions.map((submission) => (
              <div key={submission.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{submission.requirementLabel}</span>
                  <Badge variant="outline">{submission.status}</Badge>
                </div>
                {submission.valueText && <p className="text-xs text-muted-foreground">{submission.valueText}</p>}
                {submission.fileUrl && (
                  <a
                    href={submission.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-600 underline dark:text-amber-400"
                  >
                    Lihat dokumen
                  </a>
                )}
                {submission.externalLink && (
                  <a
                    href={submission.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-amber-600 underline dark:text-amber-400"
                  >
                    Buka tautan
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Riwayat status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {reg.statusLogs.map((log) => (
            <div key={log.id} className="flex gap-3 text-sm">
              <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" />
              <div>
                <p>
                  <span className="font-medium">{log.toStatus}</span>
                  <span className="text-muted-foreground"> · {log.actorName}</span>
                </p>
                {log.note && <p className="text-xs text-muted-foreground">{log.note}</p>}
                <p className="text-[11px] text-muted-foreground">{formatDateTime(log.createdAt)}</p>
              </div>
            </div>
          ))}
          {reg.statusLogs.length === 0 && <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>}
        </CardContent>
      </Card>
    </>
  )
}
