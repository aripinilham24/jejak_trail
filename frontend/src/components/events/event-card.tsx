import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ArrowUpRight, CalendarDays, Flame, MapPin, Mountain, Route, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EventCover } from "@/components/shared/event-cover"
import { QuotaBar } from "@/components/shared/quota-bar"
import { StatusBadge } from "@/components/shared/status-badge"
import { formatDateShort, formatDistanceKm, formatElevation, formatIDR, percent } from "@/lib/format"
import { DIFFICULTY_CLASS, DIFFICULTY_LABEL } from "@/lib/constants"
import type { Event } from "@/types"
import { cn } from "@/lib/utils"

export function EventTypeBadge({ event, className }: { event: Event; className?: string }) {
  const { t } = useTranslation()
  if (event.eventType === "native") {
    return (
      <Badge
        variant="outline"
        className={cn("gap-1 rounded-full border-amber-400/40 bg-amber-400/10 text-[11px] font-medium text-amber-700 dark:text-amber-300", className)}
      >
        <Flame className="size-3" />
        {t("event.native")}
      </Badge>
    )
  }
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 rounded-full border-border bg-background/70 text-[11px] font-medium text-muted-foreground", className)}
    >
      <ArrowUpRight className="size-3" />
      {t("event.external")}
    </Badge>
  )
}

function eventRange(event: Event) {
  const start = formatDateShort(event.eventStartAt)
  const end = formatDateShort(event.eventEndAt)
  return start === end ? start : `${start} – ${end}`
}

function cheapest(event: Event) {
  if (event.categories.length === 0) return null
  return Math.min(...event.categories.map((c) => c.price))
}

function farthest(event: Event) {
  if (event.categories.length === 0) return null
  return event.categories.reduce((max, c) => (c.distanceKm > max.distanceKm ? c : max), event.categories[0]!)
}

function totalQuota(event: Event) {
  return event.categories.reduce((sum, c) => sum + c.quota, 0)
}

export function EventCard({
  event,
  variant = "default",
  className,
}: {
  event: Event
  variant?: "default" | "featured" | "compact"
  className?: string
}) {
  const { t } = useTranslation()
  const far = farthest(event)
  const price = cheapest(event)
  const quota = totalQuota(event)
  const filled = event.participantCount
  const href = `/events/${event.slug}`

  if (variant === "compact") {
    return (
      <Link
        to={href}
        className={cn(
          "panel group flex items-center gap-3 rounded-xl p-3 transition-all hover:border-amber-500/40",
          className,
        )}
      >
        <EventCover seed={event.slug} compact className="size-14 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-semibold">{event.title}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <CalendarDays className="size-3" />
            {eventRange(event)}
            <span className="text-border">•</span>
            <MapPin className="size-3" />
            {event.city}
          </p>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-500" />
      </Link>
    )
  }

  const isFeatured = variant === "featured"

  return (
    <article
      className={cn(
        "panel group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-[0_28px_60px_-40px_rgba(245,165,36,0.55)]",
        isFeatured && "md:flex-row",
        className,
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          isFeatured ? "h-48 md:h-auto md:w-[46%]" : "h-44",
        )}
      >
        <EventCover seed={event.slug} fill />
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <EventTypeBadge event={event} />
            {event.isFeatured && (
              <Badge className="rounded-full border-0 bg-amber-500 text-[11px] font-semibold text-amber-950">
                {t("event.featured")}
              </Badge>
            )}
          </div>
          <StatusBadge status={event.status} dot={false} className="bg-background/80 backdrop-blur" />
        </div>
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col gap-3 p-4", isFeatured && "md:p-6")}>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {event.city}, {event.province}
            </span>
          </div>
          <h3
            className={cn(
              "font-display font-semibold leading-snug tracking-tight",
              isFeatured ? "text-xl md:text-2xl" : "text-base",
            )}
          >
            <Link to={href} className="transition-colors hover:text-amber-600 dark:hover:text-amber-400">
              {event.title}
            </Link>
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3" />
            {eventRange(event)}
            {event.organizerName !== "Event eksternal" && (
              <>
                <span className="text-border">•</span>
                <span className="truncate">{event.organizerName}</span>
              </>
            )}
          </p>
        </div>

        {far && (
          <div className="flex flex-wrap items-center gap-1.5">
            {event.categories.slice(0, isFeatured ? 4 : 3).map((category) => (
              <Badge
                key={category.id}
                variant="outline"
                className={cn(
                  "rounded-md border-border bg-surface-2/60 font-mono text-[11px] font-medium",
                  DIFFICULTY_CLASS[category.difficulty],
                )}
              >
                {formatDistanceKm(category.distanceKm)}
              </Badge>
            ))}
            <Badge variant="outline" className="gap-1 rounded-md border-border bg-surface-2/60 text-[11px]">
              <Mountain className="size-3" />
              {formatElevation(far.elevationGainM)}
            </Badge>
            <Badge
              variant="outline"
              className={cn("rounded-md text-[11px]", DIFFICULTY_CLASS[far.difficulty])}
            >
              {DIFFICULTY_LABEL[far.difficulty]}
            </Badge>
          </div>
        )}

        {isFeatured && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {event.description}
          </p>
        )}

        {event.eventType === "native" && quota > 0 ? (
          <QuotaBar filled={filled} quota={quota} size="sm" className="mt-auto" />
        ) : (
          <p className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Route className="size-3.5" />
            {t("event.externalHint")}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <div className="min-w-0">
            {price !== null ? (
              <>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Mulai dari</p>
                <p className="font-mono text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {formatIDR(price)}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Harga di halaman penyelenggara</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {event.eventType === "native" && quota > 0 && percent(filled, quota) >= 85 && (
              <span className="hidden items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-300 sm:inline-flex">
                <Users className="size-3" />
                {t("detail.slotsLeft", { count: Math.max(0, quota - filled) })}
              </span>
            )}
            <Button asChild size="sm" variant={isFeatured ? "default" : "outline"} className="rounded-full">
              <Link to={href}>{t("actions.viewDetail")}</Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
