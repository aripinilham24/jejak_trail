import { useTranslation } from "react-i18next"
import { SlidersHorizontal, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { DIFFICULTY_LABEL, DISTANCE_BUCKETS } from "@/lib/constants"
import { formatIDR } from "@/lib/format"
import type { Difficulty, EventType } from "@/types"
import { cn } from "@/lib/utils"

export interface EventFilterState {
  q: string
  province: string
  city: string
  month: string
  distance: string
  difficulties: Difficulty[]
  maxPrice: number
  registration: "all" | "open" | "closing" | "closed"
  eventType: "all" | EventType
  sort: "nearest" | "cheapest" | "popular" | "newest"
}

export const DEFAULT_FILTERS: EventFilterState = {
  q: "",
  province: "all",
  city: "all",
  month: "all",
  distance: "all",
  difficulties: [],
  maxPrice: 2_000_000,
  registration: "all",
  eventType: "all",
  sort: "nearest",
}

interface FilterPanelProps {
  filters: EventFilterState
  onChange: (patch: Partial<EventFilterState>) => void
  onReset: () => void
  provinces: string[]
  cities: string[]
  months: { value: string; label: string }[]
  resultCount: number
}

function FilterBody({
  filters,
  onChange,
  onReset,
  provinces,
  cities,
  months,
  resultCount,
}: FilterPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-display text-sm font-semibold">
          <SlidersHorizontal className="size-4 text-amber-500" />
          {t("filter.title")}
        </p>
        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={onReset}>
          <X className="size-3" />
          {t("actions.clearAll")}
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t("filter.eventType")}</Label>
        <RadioGroup
          value={filters.eventType}
          onValueChange={(value) => onChange({ eventType: value as EventFilterState["eventType"] })}
          className="grid grid-cols-3 gap-1"
        >
          {(["all", "native", "external"] as const).map((value) => (
            <Label
              key={value}
              htmlFor={`etype-${value}`}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-xs font-medium transition-colors",
                filters.eventType === value
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground hover:bg-accent/60",
              )}
            >
              <RadioGroupItem id={`etype-${value}`} value={value} className="sr-only" />
              {value === "all" ? t("common.all") : t(`event.${value}`)}
            </Label>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs">{t("filter.province")}</Label>
        <Select value={filters.province} onValueChange={(value) => onChange({ province: value, city: "all" })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {provinces.map((province) => (
              <SelectItem key={province} value={province}>
                {province}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t("filter.city")}</Label>
        <Select value={filters.city} onValueChange={(value) => onChange({ city: value })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">{t("filter.month")}</Label>
        <Select value={filters.month} onValueChange={(value) => onChange({ month: value })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all")}</SelectItem>
            {months.map((month) => (
              <SelectItem key={month.value} value={month.value}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs">{t("filter.distance")}</Label>
        <RadioGroup
          value={filters.distance}
          onValueChange={(value) => onChange({ distance: value })}
          className="space-y-1"
        >
          <Label className="flex cursor-pointer items-center gap-2 text-xs font-normal">
            <RadioGroupItem value="all" />
            {t("common.all")}
          </Label>
          {DISTANCE_BUCKETS.map((bucket) => (
            <Label key={bucket.value} className="flex cursor-pointer items-center gap-2 text-xs font-normal">
              <RadioGroupItem value={bucket.value} />
              {bucket.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs">{t("filter.difficulty")}</Label>
        <div className="space-y-1.5">
          {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((difficulty) => (
            <Label key={difficulty} className="flex cursor-pointer items-center gap-2 text-xs font-normal">
              <Checkbox
                checked={filters.difficulties.includes(difficulty)}
                onCheckedChange={(checked) =>
                  onChange({
                    difficulties: checked
                      ? [...filters.difficulties, difficulty]
                      : filters.difficulties.filter((d) => d !== difficulty),
                  })
                }
              />
              {DIFFICULTY_LABEL[difficulty]}
            </Label>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{t("filter.price")}</Label>
          <span className="font-mono text-[11px] text-amber-700 dark:text-amber-300">
            ≤ {formatIDR(filters.maxPrice, true)}
          </span>
        </div>
        <Slider
          value={[filters.maxPrice]}
          min={100_000}
          max={2_000_000}
          step={50_000}
          onValueChange={([value]) => onChange({ maxPrice: value ?? 2_000_000 })}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs">{t("filter.registrationStatus")}</Label>
        <RadioGroup
          value={filters.registration}
          onValueChange={(value) => onChange({ registration: value as EventFilterState["registration"] })}
          className="space-y-1"
        >
          {(
            [
              ["all", t("common.all")],
              ["open", t("filter.open")],
              ["closing", t("filter.closingSoon")],
              ["closed", t("filter.closed")],
            ] as const
          ).map(([value, label]) => (
            <Label key={value} className="flex cursor-pointer items-center gap-2 text-xs font-normal">
              <RadioGroupItem value={value} />
              {label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      <p className="rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-center text-xs text-muted-foreground">
        {t("filter.resultCount", { count: resultCount })}
      </p>
    </div>
  )
}

export function EventFilterSidebar(props: FilterPanelProps) {
  const { t } = useTranslation()

  return (
    <>
      <aside className="hidden w-72 shrink-0 lg:block">
        <div className="panel sticky top-24 max-h-[calc(100svh-7rem)] overflow-y-auto rounded-xl p-4">
          <FilterBody {...props} />
        </div>
      </aside>

      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="size-4" />
              {t("filter.title")}
              <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[11px]">
                {props.resultCount}
              </Badge>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] overflow-y-auto">
            <SheetTitle className="sr-only">{t("filter.title")}</SheetTitle>
            <div className="p-4">
              <FilterBody {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
