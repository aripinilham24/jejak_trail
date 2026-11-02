import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useOrganizerEvent, useSubmitOrganizerEvent } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort, formatDateTime, formatIDR } from "@/lib/format"

export function OrganizerEventDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const eventQuery = useOrganizerEvent(id)
  const submit = useSubmitOrganizerEvent()
  const event = eventQuery.data

  async function handleSubmit() {
    if (!id || !window.confirm("Kirim event ini untuk review admin?")) return
    try {
      await submit.mutateAsync(id)
      toast.success("Event dikirim untuk review")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  if (eventQuery.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!event) {
    return <Heading>Event tidak ditemukan</Heading>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
            <Link to="/organizer/events">
              <ArrowLeft className="size-3.5" />
              Semua event
            </Link>
          </Button>
          <Heading>{event.title}</Heading>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={event.status === "published" ? "default" : "outline"}>{event.status}</Badge>
            <span>
              {formatDateShort(event.eventStartAt)} · {event.city}, {event.province}
            </span>
          </div>
        </div>
        {event.status === "draft" && (
          <Button disabled={submit.isPending} onClick={() => void handleSubmit()}>
            {submit.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Kirim review
          </Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("detail.about")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{event.description || "—"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider">Pendaftaran dibuka</p>
                <p className="font-medium text-foreground">
                  {event.registrationOpenAt ? formatDateTime(event.registrationOpenAt) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider">Pendaftaran ditutup</p>
                <p className="font-medium text-foreground">
                  {event.registrationCloseAt ? formatDateTime(event.registrationCloseAt) : "—"}
                </p>
              </div>
            </div>
            {event.mandatoryGear.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wider">Mandatory gear</p>
                <p className="text-foreground">{event.mandatoryGear.join(", ")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Peserta</span>
              <span className="font-mono">{event.participantCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Kategori</span>
              <span className="font-mono">{event.categories.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Kebijakan refund</span>
              <span className="font-mono">{event.refundPolicy?.policyType ?? "—"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kategori</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jarak</TableHead>
                <TableHead>Elevasi</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Kuota</TableHead>
                <TableHead>Kualifikasi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {event.categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.distanceKm} km</TableCell>
                  <TableCell>{category.elevationGainM} m</TableCell>
                  <TableCell>{formatIDR(category.price)}</TableCell>
                  <TableCell>{category.quota}</TableCell>
                  <TableCell>{category.requiresQualification ? "Ya" : "Tidak"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Syarat kualifikasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {event.requirements.length === 0 && <p className="text-muted-foreground">Belum ada syarat.</p>}
            {event.requirements.map((requirement) => (
              <div key={requirement.id} className="rounded-lg border border-border px-3 py-2">
                <p className="font-medium">{requirement.label}</p>
                <p className="text-xs text-muted-foreground">
                  {requirement.requirementType} · {requirement.isRequired ? "Wajib" : "Opsional"}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Form peserta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {event.formFields.length === 0 && <p className="text-muted-foreground">Belum ada field.</p>}
            {event.formFields.map((field) => (
              <div key={field.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="font-medium">{field.label}</p>
                  <p className="text-xs text-muted-foreground">{field.fieldType}</p>
                </div>
                <div className="flex gap-1">
                  {field.isRequired && <Badge variant="outline">wajib</Badge>}
                  {field.isSensitive && <Badge variant="outline">sensitif</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {event.refundPolicy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kebijakan refund</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">{event.refundPolicy.name}</p>
            <p className="text-muted-foreground">{event.refundPolicy.description}</p>
            {event.refundPolicy.rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <span>
                  {rule.daysBeforeEventMin}
                  {rule.daysBeforeEventMax !== null ? `–${rule.daysBeforeEventMax}` : "+"} hari sebelum event
                </span>
                <span className="font-mono">{rule.refundPercent}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Peserta</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Daftar peserta akan tersedia setelah alur pendaftaran (milestone berikutnya) aktif.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
