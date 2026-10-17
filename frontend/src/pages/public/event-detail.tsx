import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Flag,
  Heart,
  Info,
  MapPin,
  Mountain,
  RefreshCcw,
  Route,
  Share2,
  ShieldAlert,
  Ticket,
  Timer,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Countdown } from "@/components/shared/countdown"
import { ElevationChart } from "@/components/shared/elevation-chart"
import { EmptyState } from "@/components/shared/empty-state"
import { EventCard, EventTypeBadge } from "@/components/events/event-card"
import { NotFoundPage } from "@/pages/public/not-found"
import { EventCover } from "@/components/shared/event-cover"
import { QuotaBar } from "@/components/shared/quota-bar"
import { StatusBadge } from "@/components/shared/status-badge"
import { useDb } from "@/lib/mock/store"
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL, REQUIREMENT_TYPE_LABEL } from "@/lib/constants"
import {
  formatCutoff,
  formatDateShort,
  formatDateTime,
  formatDistanceKm,
  formatElevation,
  formatIDR,
  initials,
} from "@/lib/format"
import { cn } from "@/lib/utils"
import type { Event } from "@/types"

type RegistrationPhase = "open" | "closing" | "closed" | "not_open" | "external"

function getPhase(event: Event): RegistrationPhase {
  if (event.eventType === "external") return "external"
  if (["cancelled", "suspended", "completed", "draft", "pending_review"].includes(event.status)) return "closed"
  const now = Date.now()
  if (event.registrationOpenAt && now < new Date(event.registrationOpenAt).getTime()) return "not_open"
  if (event.registrationCloseAt && now > new Date(event.registrationCloseAt).getTime()) return "closed"
  if (event.status === "registration_closed") return "closed"
  const quota = event.categories.reduce((sum, c) => sum + c.quota, 0)
  if (quota > 0 && event.participantCount >= quota) return "closed"
  if (event.registrationCloseAt && new Date(event.registrationCloseAt).getTime() - now < 14 * 86_400_000) return "closing"
  return "open"
}

export function EventDetailPage() {
  const { slug } = useParams()
  const { t } = useTranslation()
  const db = useDb()
  const [activeTab, setActiveTab] = useState("ringkasan")

  const event = db.events.find((item) => item.slug === slug)

  const related = useMemo(() => {
    if (!event) return []
    return db.events
      .filter(
        (item) =>
          item.id !== event.id &&
          item.province === event.province &&
          ["published", "registration_closed"].includes(item.status),
      )
      .slice(0, 2)
  }, [db.events, event])

  if (!event) return <NotFoundPage />

  const phase = getPhase(event)
  const quota = event.categories.reduce((sum, c) => sum + c.quota, 0)
  const filled = event.participantCount
  const far = event.categories.reduce<Event["categories"][number] | null>(
    (max, category) => (!max || category.distanceKm > max.distanceKm ? category : max),
    null,
  )
  const requirements = event.requirements
  const refundPolicy = event.refundPolicy
  const organizer = event.organizationId
    ? db.organizations.find((o) => o.id === event.organizationId)
    : undefined

  const registerHref =
    phase === "external"
      ? event.externalUrl ?? "#"
      : `/events/${event.slug}/daftar`

  const canRegister = phase === "open" || phase === "closing"

  const ctaLabel =
    phase === "external"
      ? t("detail.registerExternal")
      : canRegister
        ? t("detail.registerInternal")
        : phase === "not_open"
          ? t("detail.registrationNotOpen")
          : t("detail.registrationClosed")

  const keyFacts = [
    {
      icon: Route,
      label: "Kategori",
      value: event.categories.length > 0 ? `${event.categories.length} kategori` : "Informasi eksternal",
    },
    {
      icon: Mountain,
      label: t("detail.gain"),
      value: far ? formatElevation(far.elevationGainM) : "—",
    },
    { icon: Users, label: "Kuota", value: quota > 0 ? `${quota} slot` : "—" },
    {
      icon: Timer,
      label: t("detail.cutoff"),
      value: far ? formatCutoff(far.cutoffMinutes) : "—",
    },
  ]

  return (
    <div className="pb-24 lg:pb-8">
      {/* Hero */}
      <section className="relative">
        <div className="relative h-[260px] w-full overflow-hidden sm:h-[340px] lg:h-[400px]">
          <EventCover seed={event.slug} fill compact />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="mx-auto -mt-24 w-full max-w-7xl px-4 sm:px-6 lg:-mt-32">
          <Button asChild variant="ghost" size="sm" className="mb-4 gap-1.5 text-muted-foreground">
            <Link to="/events">
              <ArrowLeft className="size-3.5" />
              Semua event
            </Link>
          </Button>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <EventTypeBadge event={event} />
              <StatusBadge status={event.status} />
              {event.isFeatured && (
                <Badge className="rounded-full border-0 bg-amber-500 text-[11px] font-semibold text-amber-950">
                  {t("event.featured")}
                </Badge>
              )}
              {event.eventType === "native" && event.categories.some((c) => c.requiresQualification) && (
                <Badge variant="outline" className="gap-1 rounded-full border-violet-400/40 bg-violet-400/10 text-[11px] text-violet-700 dark:text-violet-300">
                  <ShieldAlert className="size-3" />
                  {t("detail.qualificationRequired")}
                </Badge>
              )}
            </div>

            <h1 className="max-w-4xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[44px]">
              {event.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-amber-500" />
                {event.locationName}, {event.city}, {event.province}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 text-amber-500" />
                {formatDateShort(event.eventStartAt)}
                {event.eventEndAt.slice(0, 10) !== event.eventStartAt.slice(0, 10) &&
                  ` – ${formatDateShort(event.eventEndAt)}`}
              </span>
              {organizer && (
                <span className="inline-flex items-center gap-1.5">
                  <BadgeCheck className="size-4 text-emerald-500" />
                  {event.organizerName}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 grid w-full max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_360px]">
        {/* Main */}
        <div className="min-w-0 space-y-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {keyFacts.map((fact) => (
              <div key={fact.label} className="panel rounded-xl p-4">
                <fact.icon className="size-4 text-amber-500" />
                <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {fact.label}
                </p>
                <p className="mt-0.5 font-display text-sm font-semibold">{fact.value}</p>
              </div>
            ))}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="scrollbar-none h-auto w-full flex-wrap justify-start gap-1 bg-surface-2/60 p-1">
              <TabsTrigger value="ringkasan">{t("detail.about")}</TabsTrigger>
              {event.eventType === "native" && (
                <TabsTrigger value="kategori">{t("detail.categories")}</TabsTrigger>
              )}
              {event.eventType === "native" && (
                <TabsTrigger value="rute">{t("detail.route")}</TabsTrigger>
              )}
              {requirements.length > 0 && (
                <TabsTrigger value="kualifikasi">{t("detail.requirements")}</TabsTrigger>
              )}
              {event.mandatoryGear.length > 0 && (
                <TabsTrigger value="gear">{t("detail.gear")}</TabsTrigger>
              )}
              {refundPolicy && <TabsTrigger value="refund">{t("detail.refund")}</TabsTrigger>}
              <TabsTrigger value="syarat">{t("detail.terms")}</TabsTrigger>
            </TabsList>

            {/* Ringkasan */}
            <TabsContent value="ringkasan" className="mt-5 space-y-6">
              <div className="panel rounded-2xl p-5">
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  {event.description}
                </p>
                <Separator className="my-5" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("detail.openRegistration")}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {event.registrationOpenAt ? formatDateTime(event.registrationOpenAt) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("detail.closeRegistration")}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {event.registrationCloseAt ? formatDateTime(event.registrationCloseAt) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {t("detail.eventDay")}
                    </p>
                    <p className="mt-1 text-sm font-medium">{formatDateTime(event.eventStartAt)}</p>
                  </div>
                </div>
                {event.eventType === "external" && event.sourceUpdatedAt && (
                  <p className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-xs text-muted-foreground">
                    <Info className="size-3.5" />
                    {t("detail.sourceUpdated")}: {formatDateShort(event.sourceUpdatedAt)}
                  </p>
                )}
              </div>

              {event.categories.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {event.categories.map((category) => {
                    const filledCount = event.categoryCounts?.[category.id] ?? 0
                    return (
                      <div key={category.id} className="panel rounded-2xl p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-display text-base font-semibold">{category.name}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className={cn("rounded-md font-mono text-[11px]", DIFFICULTY_CLASS[category.difficulty])}>
                                {DIFFICULTY_LABEL[category.difficulty]}
                              </Badge>
                              <Badge variant="outline" className="rounded-md font-mono text-[11px]">
                                {formatDistanceKm(category.distanceKm)}
                              </Badge>
                              <Badge variant="outline" className="rounded-md font-mono text-[11px]">
                                {formatElevation(category.elevationGainM)}
                              </Badge>
                            </div>
                          </div>
                          <p className="shrink-0 font-mono text-sm font-semibold text-amber-600 dark:text-amber-300">
                            {formatIDR(category.price)}
                          </p>
                        </div>
                        <QuotaBar filled={filledCount} quota={category.quota} className="mt-4" size="sm" />
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Timer className="size-3" />
                            Cut-off {formatCutoff(category.cutoffMinutes)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Flag className="size-3" />
                            Usia min {category.minAge} tahun
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Ticket className="size-3" />
                            BIB {category.bibPrefix}-xxxx
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Kategori (detail table) */}
            <TabsContent value="kategori" className="mt-5">
              <div className="panel overflow-hidden rounded-2xl">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Jarak</TableHead>
                      <TableHead className="hidden sm:table-cell">Elevasi</TableHead>
                      <TableHead className="hidden md:table-cell">Cut-off</TableHead>
                      <TableHead>Kuota</TableHead>
                      <TableHead className="text-right">Harga</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {event.categories.map((category) => {
                      const filledCount = event.categoryCounts?.[category.id] ?? 0
                      const full = filledCount >= category.quota
                      return (
                        <TableRow key={category.id}>
                          <TableCell>
                            <p className="font-medium">{category.name}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-medium", DIFFICULTY_CLASS[category.difficulty])}>
                                {DIFFICULTY_LABEL[category.difficulty]}
                              </span>
                              {category.requiresQualification ? (
                                <span className="text-[10px] text-violet-600 dark:text-violet-300">
                                  {t("detail.qualificationRequired")}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">
                                  {t("detail.qualificationNotRequired")}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{formatDistanceKm(category.distanceKm)}</TableCell>
                          <TableCell className="hidden font-mono text-xs sm:table-cell">
                            {formatElevation(category.elevationGainM)}
                          </TableCell>
                          <TableCell className="hidden font-mono text-xs md:table-cell">
                            {formatCutoff(category.cutoffMinutes)}
                          </TableCell>
                          <TableCell className="min-w-[140px]">
                            <QuotaBar filled={filledCount} quota={category.quota} size="sm" showLabels={false} />
                            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                              {filledCount}/{category.quota}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-semibold">
                            {formatIDR(category.price)}
                          </TableCell>
                          <TableCell className="text-right">
                            {canRegister ? (
                              <Button asChild size="xs" variant={full ? "outline" : "default"} className="rounded-full">
                                <Link to={`/events/${event.slug}/daftar?kategori=${category.id}`}>
                                  {full ? t("detail.waitlistOpen") : t("actions.register")}
                                </Link>
                              </Button>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Rute */}
            <TabsContent value="rute" className="mt-5 space-y-5">
              <div className="panel rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold">
                      {t("detail.elevationProfile")} · {far ? far.name : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {far
                        ? `${formatDistanceKm(far.distanceKm)} · ${formatElevation(far.elevationGainM)} D+`
                        : "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="rounded-lg border border-border bg-surface-2/60 px-2.5 py-1.5">
                      <span className="text-muted-foreground">Puncak </span>
                      <span className="font-mono font-medium">
                        {event.routeProfile.length > 0
                          ? formatElevation(Math.max(...event.routeProfile.map((p) => p.elevation)))
                          : "—"}
                      </span>
                    </span>
                    <span className="rounded-lg border border-border bg-surface-2/60 px-2.5 py-1.5">
                      <span className="text-muted-foreground">Terendah </span>
                      <span className="font-mono font-medium">
                        {event.routeProfile.length > 0
                          ? formatElevation(Math.min(...event.routeProfile.map((p) => p.elevation)))
                          : "—"}
                      </span>
                    </span>
                  </div>
                </div>
                <ElevationChart points={event.routeProfile} height={240} className="mt-4" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {event.categories.map((category) => (
                  <div key={category.id} className="panel rounded-2xl p-4">
                    <p className="font-display text-sm font-semibold">{category.name}</p>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Jarak</p>
                        <p className="font-mono font-medium">{formatDistanceKm(category.distanceKm)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">D+</p>
                        <p className="font-mono font-medium">{formatElevation(category.elevationGainM)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cut-off</p>
                        <p className="font-mono font-medium">{formatCutoff(category.cutoffMinutes)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Kualifikasi */}
            <TabsContent value="kualifikasi" className="mt-5 space-y-5">
              {event.categories
                .filter((category) => category.requiresQualification)
                .map((category) => (
                  <div key={category.id} className="panel rounded-2xl p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-base font-semibold">{category.name}</p>
                      <Badge variant="outline" className="rounded-full border-violet-400/40 bg-violet-400/10 text-[11px] text-violet-700 dark:text-violet-300">
                        {t("detail.qualificationRequired")}
                      </Badge>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {requirements
                        .filter((requirement) => requirement.categoryId === category.id)
                        .map((requirement) => (
                          <li key={requirement.id} className="flex gap-3 rounded-xl border border-border bg-surface-2/40 p-3.5">
                            <span
                              className={cn(
                                "mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border",
                                requirement.isRequired
                                  ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300"
                                  : "border-border bg-background/60 text-muted-foreground",
                              )}
                            >
                              {requirement.requirementType === "medical_certificate" ? (
                                <FileText className="size-3.5" />
                              ) : requirement.requirementType === "finisher_certificate" ? (
                                <Award className="size-3.5" />
                              ) : (
                                <ExternalLink className="size-3.5" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                {requirement.label}
                                <span
                                  className={cn(
                                    "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                                    requirement.isRequired
                                      ? "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300"
                                      : "border-border text-muted-foreground",
                                  )}
                                >
                                  {requirement.isRequired ? "wajib" : "opsional"}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  {REQUIREMENT_TYPE_LABEL[requirement.requirementType]}
                                </span>
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {requirement.description}
                              </p>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
            </TabsContent>

            {/* Mandatory gear */}
            <TabsContent value="gear" className="mt-5">
              <div className="panel rounded-2xl p-5">
                <p className="text-sm text-muted-foreground">
                  Pemeriksaan mandatory gear dilakukan di area start. Peserta yang tidak melengkapi
                  perlengkapan wajib dapat kehilangan hak start tanpa refund.
                </p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {event.mandatoryGear.map((gear) => (
                    <li key={gear} className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2/40 px-3.5 py-2.5 text-sm">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                      {gear}
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            {/* Refund */}
            <TabsContent value="refund" className="mt-5">
              {refundPolicy ? (
                <div className="panel rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-semibold">{refundPolicy.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Versi kebijakan {refundPolicy.version} · berlaku sejak{" "}
                        {formatDateShort(refundPolicy.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="gap-1 rounded-full">
                      <RefreshCcw className="size-3" />
                      {refundPolicy.policyType === "tiered"
                        ? "Bertingkat"
                        : refundPolicy.policyType === "no_refund"
                          ? "Tanpa refund"
                          : "Refund penuh"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {refundPolicy.description}
                  </p>
                  {refundPolicy.rules.length > 0 && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Jarak ke hari event</TableHead>
                            <TableHead className="text-right">Persentase refund</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {refundPolicy.rules.map((rule) => (
                            <TableRow key={rule.id}>
                              <TableCell className="text-sm">
                                {rule.daysBeforeEventMax === null
                                  ? `≥ ${rule.daysBeforeEventMin} hari`
                                  : `${rule.daysBeforeEventMin}–${rule.daysBeforeEventMax} hari`}
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-semibold text-amber-600 dark:text-amber-300">
                                {rule.refundPercent}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <p className="mt-4 text-xs text-muted-foreground">
                    Kebijakan yang Anda setujui disimpan bersama transaksi beserta versinya, sehingga
                    tidak berubah bila penyelenggara memperbarui kebijakan setelah Anda membayar.
                  </p>
                </div>
              ) : (
                <EmptyState icon={RefreshCcw} title="Kebijakan refund belum ditetapkan" />
              )}
            </TabsContent>

            {/* Syarat */}
            <TabsContent value="syarat" className="mt-5">
              <div className="panel rounded-2xl p-5 text-sm leading-relaxed text-muted-foreground">
                {event.terms}
              </div>
            </TabsContent>
          </Tabs>

          {related.length > 0 && (
            <div className="space-y-4">
              <p className="font-display text-base font-semibold">Event lain di {event.province}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {related.map((item) => (
                  <EventCard key={item.id} event={item} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sticky CTA */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="panel space-y-5 rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {event.eventType === "native" ? "Mulai dari" : "Pendaftaran"}
                </p>
                <p className="font-display text-2xl font-semibold">
                  {event.categories.length > 0
                    ? formatIDR(Math.min(...event.categories.map((c) => c.price)))
                    : "Eksternal"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={t("detail.saveEvent")}
                  onClick={() => toast.success("Event disimpan ke daftar Anda")}
                >
                  <Heart className="size-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={t("detail.share")}
                  onClick={() => toast.success("Tautan event disalin")}
                >
                  <Share2 className="size-3.5" />
                </Button>
              </div>
            </div>

            {event.eventType === "native" && quota > 0 && (
              <QuotaBar filled={filled} quota={quota} />
            )}

            {phase === "closing" && event.registrationCloseAt && (
              <Countdown target={event.registrationCloseAt} label={t("detail.closeRegistration")} />
            )}

            {phase === "external" ? (
              <Button asChild size="lg" className="w-full rounded-full">
                <a href={registerHref} target="_blank" rel="noreferrer">
                  {ctaLabel}
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            ) : (
              <Button
                asChild={canRegister}
                size="lg"
                disabled={!canRegister}
                className="w-full rounded-full"
              >
                {canRegister ? <Link to={registerHref}>{ctaLabel}</Link> : <span>{ctaLabel}</span>}
              </Button>
            )}

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Jenis event</span>
                <span className="font-medium">
                  {event.eventType === "native" ? t("event.native") : t("event.external")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Verifikasi</span>
                <span className="font-medium">
                  {event.categories.some((c) => c.requiresQualification)
                    ? "Perlu kualifikasi"
                    : "Tanpa kualifikasi"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Peserta</span>
                <span className="font-mono font-medium">{filled}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Batas pendaftaran</span>
                <span className="font-mono font-medium">
                  {event.registrationCloseAt ? formatDateShort(event.registrationCloseAt) : "—"}
                </span>
              </div>
            </div>

            <Separator />

            {organizer ? (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {t("detail.organizers")}
                </p>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-[#123523] to-[#071410] text-xs font-semibold text-amber-200">
                    {initials(organizer.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{organizer.name}</p>
                    <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-300">
                      <BadgeCheck className="size-3" />
                      {t("detail.verifiedOrganizer")}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{organizer.city}, {organizer.province}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Event dikurasi oleh admin platform dari sumber penyelenggara.
              </p>
            )}

            <Separator />

            <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-2/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
              <Clock className="mt-0.5 size-3.5 shrink-0" />
              Untuk event berkualifikasi, pendaftaran dikirim lebih dulu untuk ditinjau
              penyelenggara. Tagihan baru terbit setelah disetujui.
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{event.title}</p>
            <p className="font-mono text-sm font-semibold">
              {event.categories.length > 0
                ? formatIDR(Math.min(...event.categories.map((c) => c.price)))
                : "Eksternal"}
            </p>
          </div>
          {phase === "external" ? (
            <Button asChild className="rounded-full">
              <a href={registerHref} target="_blank" rel="noreferrer">
                {ctaLabel}
              </a>
            </Button>
          ) : (
            <Button asChild={canRegister} disabled={!canRegister} className="rounded-full">
              {canRegister ? <Link to={registerHref}>{ctaLabel}</Link> : <span>{ctaLabel}</span>}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
