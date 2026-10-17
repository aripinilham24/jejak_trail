import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { EventTypeBadge } from "@/components/events/event-card"
import { SectionHeading } from "@/components/shared/section-heading"
import { useDb } from "@/lib/mock/store"
import { formatDateShort, formatMonthYear } from "@/lib/format"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startOffset = (first.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array.from({ length: startOffset }, () => null)
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function CalendarPage() {
  const { t } = useTranslation()
  const db = useDb()
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const events = useMemo(
    () =>
      db.events
        .filter((event) => ["published", "registration_closed"].includes(event.status))
        .sort((a, b) => a.eventStartAt.localeCompare(b.eventStartAt)),
    [db.events],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, typeof events>()
    events.forEach((event) => {
      const key = event.eventStartAt.slice(0, 10)
      map.set(key, [...(map.get(key) ?? []), event])
    })
    return map
  }, [events])

  const cells = monthMatrix(cursor.year, cursor.month)
  const monthLabel = formatMonthYear(new Date(cursor.year, cursor.month, 1))

  const monthEvents = events.filter((event) => {
    const date = new Date(event.eventStartAt)
    return date.getFullYear() === cursor.year && date.getMonth() === cursor.month
  })

  const selectedKey = selectedDay
  const selectedEvents = selectedKey ? (byDay.get(selectedKey) ?? []) : monthEvents

  const shiftMonth = (delta: number) => {
    setCursor((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
    setSelectedDay(null)
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <SectionHeading
        eyebrow="Kalender"
        title={t("nav.calendar")}
        subtitle="Lihat seluruh event trail run yang tercatat, event native maupun event eksternal, dalam satu tampilan bulanan."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="panel rounded-2xl p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-amber-500" />
              <p className="font-display text-base font-semibold">{monthLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(-1)} aria-label="Bulan sebelumnya">
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-mono text-xs"
                onClick={() => {
                  setCursor({ year: today.getFullYear(), month: today.getMonth() })
                  setSelectedDay(null)
                }}
              >
                Hari ini
              </Button>
              <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(1)} aria-label="Bulan berikutnya">
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day) => (
              <div key={day} className="pb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {day}
              </div>
            ))}
            {cells.map((day, index) => {
              if (day === null) return <div key={`empty-${index}`} />
              const key = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const dayEvents = byDay.get(key) ?? []
              const isToday =
                day === today.getDate() &&
                cursor.month === today.getMonth() &&
                cursor.year === today.getFullYear()
              const isSelected = selectedDay === key

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-start gap-1 rounded-lg border p-1.5 text-xs transition-colors",
                    dayEvents.length > 0
                      ? "border-border bg-surface-2/60 hover:border-amber-500/50"
                      : "border-transparent text-muted-foreground hover:bg-accent/50",
                    isSelected && "border-amber-500/60 bg-amber-500/10",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 place-items-center rounded-full font-medium",
                      isToday && "bg-amber-500 text-amber-950",
                    )}
                  >
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="flex flex-wrap items-center justify-center gap-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className={cn(
                            "size-1.5 rounded-full",
                            event.eventType === "native" ? "bg-amber-500" : "bg-emerald-500",
                          )}
                        />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <Separator className="my-4" />
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" /> Event native
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" /> Event eksternal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-4 rounded-full bg-amber-500" /> Hari ini
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-semibold">
              {selectedKey ? formatDateShort(selectedKey) : `Semua event ${monthLabel}`}
            </p>
            <Badge variant="outline" className="rounded-full font-normal">
              {selectedEvents.length} event
            </Badge>
          </div>

          {selectedEvents.length === 0 && (
            <p className="panel rounded-xl p-6 text-center text-sm text-muted-foreground">
              Tidak ada event pada periode ini.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {selectedEvents.map((event) => (
              <Link
                key={event.id}
                to={`/events/${event.slug}`}
                className="panel group rounded-xl p-4 transition-all hover:border-amber-500/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold">{event.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {event.city}, {event.province}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs font-medium text-amber-600 dark:text-amber-300">
                      {formatDateShort(event.eventStartAt)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {event.categories[0] ? `${event.categories[0].distanceKm} km+` : "Eksternal"}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <EventTypeBadge event={event} />
                  {event.categories.length > 1 && (
                    <Badge variant="outline" className="rounded-full text-[11px] font-normal">
                      {event.categories.length} kategori
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
