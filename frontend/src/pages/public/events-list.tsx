import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { CalendarRange, LayoutGrid, List, Search, Trophy, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EventCard } from "@/components/events/event-card"
import {
  DEFAULT_FILTERS,
  EventFilterSidebar,
  type EventFilterState,
} from "@/components/events/event-filters"
import { DataPagination } from "@/components/shared/data-pagination"
import { EmptyState } from "@/components/shared/empty-state"
import { useDb } from "@/lib/mock/store"
import { LIST_PAGE_SIZE } from "@/lib/constants"
import { formatMonthYear } from "@/lib/format"
import type { Event } from "@/types"

function registrationPhase(event: Event): "open" | "closing" | "closed" {
  if (event.eventType === "external") return "open"
  if (event.status === "registration_closed" || event.status === "completed") return "closed"
  if (!event.registrationCloseAt) return "open"
  const closeAt = new Date(event.registrationCloseAt).getTime()
  const now = Date.now()
  if (now > closeAt) return "closed"
  const quota = event.categories.reduce((sum, c) => sum + c.quota, 0)
  if (quota > 0 && event.participantCount >= quota) return "closed"
  if (closeAt - now < 14 * 86_400_000) return "closing"
  return "open"
}

function cheapestPrice(event: Event) {
  if (event.categories.length === 0) return 0
  return Math.min(...event.categories.map((c) => c.price))
}

function matchesDistance(event: Event, bucket: string) {
  if (bucket === "all") return true
  return event.categories.some((category) => {
    const km = category.distanceKm
    switch (bucket) {
      case "0-15":
        return km <= 15
      case "15-30":
        return km > 15 && km <= 30
      case "30-50":
        return km > 30 && km <= 50
      case "50-100":
        return km > 50 && km <= 100
      case "100+":
        return km > 100
      default:
        return true
    }
  })
}

export function EventsListPage() {
  const { t } = useTranslation()
  const db = useDb()
  const [filters, setFilters] = useState<EventFilterState>(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)
  const [view, setView] = useState<"grid" | "list">("grid")

  const baseEvents = useMemo(
    () =>
      db.events.filter((event) =>
        ["published", "registration_closed"].includes(event.status),
      ),
    [db.events],
  )

  const provinces = useMemo(
    () => [...new Set(baseEvents.map((e) => e.province))].sort(),
    [baseEvents],
  )

  const cities = useMemo(() => {
    const pool = filters.province === "all" ? baseEvents : baseEvents.filter((e) => e.province === filters.province)
    return [...new Set(pool.map((e) => e.city))].sort()
  }, [baseEvents, filters.province])

  const months = useMemo(() => {
    const set = new Map<string, string>()
    baseEvents.forEach((event) => {
      const key = event.eventStartAt.slice(0, 7)
      if (!set.has(key)) set.set(key, formatMonthYear(event.eventStartAt))
    })
    return [...set.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }))
  }, [baseEvents])

  const filtered = useMemo(() => {
    const query = filters.q.trim().toLowerCase()
    const result = baseEvents.filter((event) => {
      if (query) {
        const haystack = `${event.title} ${event.city} ${event.province} ${event.organizerName} ${event.locationName}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      if (filters.province !== "all" && event.province !== filters.province) return false
      if (filters.city !== "all" && event.city !== filters.city) return false
      if (filters.month !== "all" && event.eventStartAt.slice(0, 7) !== filters.month) return false
      if (!matchesDistance(event, filters.distance)) return false
      if (
        filters.difficulties.length > 0 &&
        !event.categories.some((c) => filters.difficulties.includes(c.difficulty))
      )
        return false
      if (event.categories.length > 0 && cheapestPrice(event) > filters.maxPrice) return false
      if (filters.registration !== "all" && registrationPhase(event) !== filters.registration) return false
      if (filters.eventType !== "all" && event.eventType !== filters.eventType) return false
      return true
    })

    switch (filters.sort) {
      case "cheapest":
        return [...result].sort((a, b) => cheapestPrice(a) - cheapestPrice(b))
      case "popular":
        return [...result].sort((a, b) => b.participantCount - a.participantCount)
      case "newest":
        return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      default:
        return [...result].sort((a, b) => a.eventStartAt.localeCompare(b.eventStartAt))
    }
  }, [baseEvents, filters])

  const pageCount = Math.max(1, Math.ceil(filtered.length / LIST_PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * LIST_PAGE_SIZE, currentPage * LIST_PAGE_SIZE)

  const organizerCount = new Set(baseEvents.map((e) => e.organizerName)).size
  const activeFilterCount =
    (filters.province !== "all" ? 1 : 0) +
    (filters.city !== "all" ? 1 : 0) +
    (filters.month !== "all" ? 1 : 0) +
    (filters.distance !== "all" ? 1 : 0) +
    filters.difficulties.length +
    (filters.maxPrice < 2_000_000 ? 1 : 0) +
    (filters.registration !== "all" ? 1 : 0) +
    (filters.eventType !== "all" ? 1 : 0)

  const onChange = (patch: Partial<EventFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
    setPage(1)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <div className="topo-pattern pointer-events-none absolute inset-x-0 top-0 h-64 opacity-40" aria-hidden />

      <div className="relative space-y-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
          Discovery
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("events.title")}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("events.subtitle", { count: baseEvents.length, organizers: organizerCount })}
        </p>
      </div>

      <div className="relative mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(event) => onChange({ q: event.target.value })}
            placeholder={t("events.searchPlaceholder")}
            className="h-10 pl-9"
          />
          {filters.q && (
            <button
              type="button"
              onClick={() => onChange({ q: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-accent"
              aria-label={t("actions.clearAll")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={filters.sort} onValueChange={(value) => onChange({ sort: value as EventFilterState["sort"] })}>
            <SelectTrigger className="h-10 w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nearest">{t("filter.sortNearest")}</SelectItem>
              <SelectItem value="cheapest">{t("filter.sortCheapest")}</SelectItem>
              <SelectItem value="popular">{t("filter.sortPopular")}</SelectItem>
              <SelectItem value="newest">{t("filter.sortNewest")}</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden items-center gap-1 rounded-lg border border-border p-0.5 sm:flex">
            <Button
              variant={view === "grid" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setView("grid")}
              aria-label="Tampilan grid"
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => setView("list")}
              aria-label="Tampilan daftar"
            >
              <List className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-8">
        <EventFilterSidebar
          filters={filters}
          onChange={onChange}
          onReset={() => {
            setFilters(DEFAULT_FILTERS)
            setPage(1)
          }}
          provinces={provinces}
          cities={cities}
          months={months}
          resultCount={filtered.length}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 rounded-full border-border bg-surface-2/60 px-3 py-1 font-normal">
              <Trophy className="size-3.5 text-amber-500" />
              {t("filter.resultCount", { count: filtered.length })}
            </Badge>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs text-muted-foreground"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS)
                  setPage(1)
                }}
              >
                <X className="size-3" />
                {t("actions.clearAll")} ({activeFilterCount})
              </Button>
            )}
          </div>

          {paged.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title={t("filter.noResult")}
              description={t("filter.noResultHint")}
              action={
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS)
                    setPage(1)
                  }}
                >
                  {t("actions.reset")}
                </Button>
              }
            />
          ) : view === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
              {paged.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {paged.map((event) => (
                <EventCard key={event.id} event={event} variant="compact" />
              ))}
            </div>
          )}

          <DataPagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />

          <Separator className="my-8" />

          <div className="panel rounded-xl p-5">
            <p className="font-display text-base font-semibold">
              Punya event trail run yang belum tercatat?
            </p>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Penyelenggara dapat mendaftarkan organisasi lalu menayangkan event native dengan
              pendaftaran, verifikasi kualifikasi, pembayaran, dan tiket QR di platform ini.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" className="rounded-full">
                <Link to="/daftar/organizer">{t("home.organizerCta")}</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to="/kalender">{t("nav.calendar")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
