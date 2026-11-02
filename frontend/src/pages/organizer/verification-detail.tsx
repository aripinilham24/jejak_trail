import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useApproveRegistration,
  useOrganizerRegistration,
  useRejectRegistration,
} from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateTime } from "@/lib/format"

export function OrganizerVerificationDetailPage() {
  const { id } = useParams()
  const query = useOrganizerRegistration(id)
  const approve = useApproveRegistration()
  const reject = useRejectRegistration()
  const reg = query.data

  async function handleApprove() {
    if (!id) return
    try {
      await approve.mutateAsync(id)
      toast.success("Pendaftaran disetujui")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function handleReject() {
    if (!id) return
    const reason = window.prompt("Alasan penolakan")
    if (!reason?.trim()) return
    try {
      await reject.mutateAsync({ id, reason })
      toast.success("Pendaftaran ditolak")
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
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Pendaftaran tidak ditemukan</h1>
        <Button asChild variant="outline">
          <Link to="/organizer/verifications">Kembali</Link>
        </Button>
      </div>
    )
  }

  const canReview = reg.status === "pending_verification"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
            <Link to="/organizer/verifications">
              <ArrowLeft className="size-3.5" />
              Antrean verifikasi
            </Link>
          </Button>
          <h1 className="font-display text-2xl font-semibold">{reg.fullNameSnapshot}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">{reg.status}</Badge>
            <span>{reg.event?.title}</span>
            <span>· {reg.category?.name}</span>
          </div>
        </div>
        {canReview && (
          <div className="flex gap-2">
            <Button variant="outline" className="text-destructive" disabled={reject.isPending} onClick={() => void handleReject()}>
              <XCircle className="mr-2 size-4" />
              Tolak
            </Button>
            <Button disabled={approve.isPending} onClick={() => void handleApprove()}>
              <CheckCircle2 className="mr-2 size-4" />
              Setujui
            </Button>
          </div>
        )}
      </div>

      {reg.rejectionReason && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Ditolak: {reg.rejectionReason}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
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
            <CardTitle className="text-base">Dokumen kualifikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reg.qualificationSubmissions.length === 0 && (
              <p className="text-sm text-muted-foreground">Tidak ada dokumen.</p>
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

      <Card>
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
        </CardContent>
      </Card>
    </div>
  )
}
