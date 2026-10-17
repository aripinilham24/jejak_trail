import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  CreditCard,
  Landmark,
  MapPin,
  Mountain,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { AnimatedNumber } from "@/components/shared/animated-number"
import { EventCover } from "@/components/shared/event-cover"
import { EventCard, EventTypeBadge } from "@/components/events/event-card"
import { SectionHeading } from "@/components/shared/section-heading"
import { useDb } from "@/lib/mock/store"
import { formatDateShort, formatIDR, formatMonthYear } from "@/lib/format"
import type { LucideIcon } from "lucide-react"

export function HomePage() {
  const { t } = useTranslation()
  const db = useDb()

  const published = db.events
    .filter((event) => ["published", "registration_closed"].includes(event.status))
    .sort((a, b) => a.eventStartAt.localeCompare(b.eventStartAt))

  const featured = published.filter((event) => event.isFeatured).slice(0, 3)
  const upcoming = published.slice(0, 6)
  const marqueeItems = published.slice(0, 8)

  const stats = [
    { label: t("home.statEvents"), value: published.length, icon: CalendarDays, suffix: "" },
    { label: t("home.statRunners"), value: db.users.length, icon: Users, suffix: "+" },
    { label: t("home.statOrganizers"), value: db.organizations.filter((o) => o.verificationStatus === "verified").length, icon: BadgeCheck, suffix: "" },
    {
      label: t("home.statVert"),
      value: db.events.reduce((sum, event) => sum + event.categories.reduce((s, c) => s + c.elevationGainM, 0), 0),
      icon: Mountain,
      suffix: " m",
    },
  ]

  const steps: { title: string; body: string; icon: LucideIcon }[] = [
    { title: t("home.step1Title"), body: t("home.step1Body"), icon: CalendarDays },
    { title: t("home.step2Title"), body: t("home.step2Body"), icon: ClipboardList },
    { title: t("home.step3Title"), body: t("home.step3Body"), icon: CreditCard },
    { title: t("home.step4Title"), body: t("home.step4Body"), icon: QrCode },
  ]

  const trust: { title: string; body: string; icon: LucideIcon }[] = [
    { title: t("home.trust1Title"), body: t("home.trust1Body"), icon: TrendingUp },
    { title: t("home.trust2Title"), body: t("home.trust2Body"), icon: ShieldCheck },
    { title: t("home.trust3Title"), body: t("home.trust3Body"), icon: Landmark },
    { title: t("home.trust4Title"), body: t("home.trust4Body"), icon: Ticket },
  ]

  const calendarGroups = upcoming.reduce<Record<string, typeof upcoming>>((groups, event) => {
    const key = formatMonthYear(event.eventStartAt)
    groups[key] = [...(groups[key] ?? []), event]
    return groups
  }, {})

  return (
    <div className="relative">
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden">
        <div className="topo-pattern pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background"
          aria-hidden
        />
        <div className="grain-overlay pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-24 lg:pt-20">
          <div className="space-y-6">
            <Badge
              variant="outline"
              className="gap-2 rounded-full border-amber-500/40 bg-amber-500/10 px-3 py-1 text-amber-700 dark:text-amber-300"
            >
              <Sparkles className="size-3.5" />
              {t("home.badge")}
            </Badge>

            <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[56px]">
              {t("home.title")}
              <span className="mt-2 block bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                {t("home.titleAccent")}
              </span>
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
              {t("home.subtitle")}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="amber-glow rounded-full">
                <Link to="/events">
                  {t("home.ctaPrimary")}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full">
                <Link to="/daftar/organizer">{t("home.ctaSecondary")}</Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <p className="font-display text-2xl font-semibold tracking-tight text-foreground">
                    <AnimatedNumber value={stat.value} />
                    {stat.suffix}
                  </p>
                  <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <stat.icon className="size-3 text-amber-500" />
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative">
            <div className="panel relative overflow-hidden rounded-3xl p-1.5">
              <div className="relative overflow-hidden rounded-[18px]">
                <EventCover seed="hero-sundoro" className="h-[300px] w-full sm:h-[380px]" />
                <div className="absolute inset-x-0 bottom-0 space-y-3 p-5">
                  <div className="flex items-center gap-2">
                    <Badge className="rounded-full border-0 bg-amber-500 text-[11px] font-semibold text-amber-950">
                      Unggulan
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-white/20 bg-black/30 text-[11px] text-white/90 backdrop-blur">
                      42K · 2.650 m D+
                    </Badge>
                  </div>
                  <p className="font-display text-2xl font-semibold text-white drop-shadow">
                    Sundoro Trail Challenge
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/80">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      Wonosobo, Jawa Tengah
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {formatDateShort(published[0]?.eventStartAt ?? new Date().toISOString())}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3" />
                      {published[0]?.participantCount ?? 0} terdaftar
                    </span>
                  </p>
                  <div className="flex items-center justify-between gap-3 border-t border-white/15 pt-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/60">Mulai dari</p>
                      <p className="font-mono text-sm font-semibold text-amber-300">
                        {formatIDR(
                          published[0]
                            ? Math.min(...published[0].categories.map((c) => c.price))
                            : 250000,
                        )}
                      </p>
                    </div>
                    <Button asChild size="sm" className="rounded-full">
                      <Link to={`/events/${published[0]?.slug ?? ""}`}>
                        {t("actions.viewDetail")}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* floating stat card */}
            <div className="panel absolute -bottom-6 -left-2 hidden w-56 rounded-2xl p-4 sm:block">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="size-3.5 text-emerald-500" />
                Verifikasi kualifikasi
              </p>
              <p className="mt-2 font-display text-3xl font-semibold tracking-tight">
                18<span className="text-base font-normal text-muted-foreground"> jam</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                rata-rata waktu keputusan penyelenggara
              </p>
            </div>

            <div className="panel absolute -right-2 -top-4 hidden w-44 rounded-2xl p-3 lg:block">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Total elevasi</p>
              <p className="mt-1 font-mono text-lg font-semibold text-amber-600 dark:text-amber-300">
                286.400 m
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-amber-500 to-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Marquee */}
        <div className="relative overflow-hidden border-y border-border bg-surface-2/40 py-3">
          <div className="animate-marquee flex w-max items-center gap-3">
            {[...marqueeItems, ...marqueeItems].map((event, index) => (
              <Link
                key={`${event.id}-${index}`}
                to={`/events/${event.slug}`}
                className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs transition-colors hover:border-amber-500/40"
              >
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span className="font-medium">{event.title}</span>
                <span className="text-muted-foreground">
                  {formatDateShort(event.eventStartAt)} · {event.city}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FEATURED ---------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Sorotan"
          title={t("home.featuredTitle")}
          subtitle={t("home.featuredSubtitle")}
          actions={
            <Button asChild variant="ghost" size="sm" className="gap-1 rounded-full">
              <Link to="/events">
                {t("actions.seeAll")}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {featured[0] && <EventCard event={featured[0]} variant="featured" className="lg:col-span-2" />}
          {featured.slice(1).map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* ---------------- CALENDAR ---------------- */}
      <section className="relative border-y border-border bg-surface-2/30">
        <div className="topo-pattern pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading
            eyebrow="Kalender"
            title={t("home.calendarTitle")}
            subtitle={t("home.calendarSubtitle")}
            actions={
              <Button asChild variant="outline" size="sm" className="gap-2 rounded-full">
                <Link to="/kalender">
                  <CalendarDays className="size-3.5" />
                  {t("nav.calendar")}
                </Link>
              </Button>
            }
          />
          <div className="mt-6 grid gap-8 lg:grid-cols-3">
            {Object.entries(calendarGroups).map(([month, events]) => (
              <div key={month} className="space-y-3">
                <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                  {month}
                </p>
                <Separator />
                <div className="flex flex-col gap-2">
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      to={`/events/${event.slug}`}
                      className="panel group flex gap-3 rounded-xl p-3 transition-all hover:border-amber-500/40"
                    >
                      <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-background/70 py-1.5">
                        <span className="font-display text-lg font-semibold leading-none">
                          {new Date(event.eventStartAt).getDate()}
                        </span>
                        <span className="font-mono text-[10px] uppercase text-muted-foreground">
                          {formatMonthYear(event.eventStartAt).slice(0, 3)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-sm font-semibold">{event.title}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {event.city}
                          <span className="text-border">•</span>
                          {event.categories[0] ? `${event.categories[0].distanceKm} km+` : "—"}
                        </p>
                        <div className="mt-1.5">
                          <EventTypeBadge event={event} />
                        </div>
                      </div>
                      <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <SectionHeading
          eyebrow="Alur"
          title={t("home.howTitle")}
          subtitle={t("home.howSubtitle")}
          align="center"
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="panel relative overflow-hidden rounded-2xl p-5">
              <span className="absolute right-3 top-2 font-display text-5xl font-semibold text-border/70">
                {index + 1}
              </span>
              <span className="grid size-10 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                <step.icon className="size-5" />
              </span>
              <h3 className="mt-3 font-display text-base font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- TRUST ---------------- */}
      <section className="relative border-y border-border bg-surface-2/30">
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
          <SectionHeading
            eyebrow="Kenapa Jejak Trail"
            title={t("home.trustTitle")}
            subtitle={t("home.trustSubtitle")}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {trust.map((item) => (
              <div key={item.title} className="panel flex gap-4 rounded-2xl p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-background/70 text-amber-600 dark:text-amber-300">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- ORGANIZER CTA ---------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
        <div className="panel relative overflow-hidden rounded-3xl">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(120% 100% at 100% 0%, rgba(245,165,36,0.22) 0%, transparent 55%), linear-gradient(160deg, rgba(15,42,29,0.6) 0%, transparent 60%)",
            }}
            aria-hidden
          />
          <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div className="space-y-4">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                Untuk penyelenggara
              </p>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {t("home.organizerTitle")}
              </h2>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t("home.organizerBody")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <Link to="/daftar/organizer">
                    {t("home.organizerCta")}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full">
                  <Link to="/organizer">{t("nav.dashboard")}</Link>
                </Button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[
                { label: t("organizer.quotaFilled"), value: "82%", icon: Users },
                { label: t("organizer.collected"), value: "Rp 1,9 M", icon: Landmark },
                { label: t("organizer.held"), value: "Rp 420 jt", icon: ShieldCheck },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-background/60 p-4">
                  <p className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <item.icon className="size-3.5 text-amber-500" />
                    {item.label}
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- NEWSLETTER ---------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <div className="panel relative overflow-hidden rounded-3xl p-6 sm:p-10">
          <div className="grain-overlay pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl space-y-2">
              <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                {t("home.newsletterTitle")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("home.newsletterBody")}
              </p>
            </div>
            <form
              className="flex w-full max-w-md gap-2"
              onSubmit={(event) => event.preventDefault()}
            >
              <Input
                type="email"
                required
                placeholder={t("home.newsletterPlaceholder")}
                className="h-11"
              />
              <Button type="submit" size="lg" className="shrink-0 rounded-full">
                {t("home.newsletterCta")}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
