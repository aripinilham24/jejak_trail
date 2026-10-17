import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns"
import { id as idLocale } from "date-fns/locale"

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : parseISO(value)
  return isValid(date) ? date : null
}

export function formatDate(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return "—"
  return format(date, "d MMMM yyyy", { locale: idLocale })
}

export function formatDateShort(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return "—"
  return format(date, "d MMM yyyy", { locale: idLocale })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return "—"
  return format(date, "d MMM yyyy, HH:mm", { locale: idLocale })
}

export function formatMonthYear(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return "—"
  return format(date, "MMMM yyyy", { locale: idLocale })
}

export function formatRelative(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return "—"
  return formatDistanceToNowStrict(date, { locale: idLocale, addSuffix: true })
}

export function formatIDR(amount: number, compact = false): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: amount % 1_000_000 === 0 ? 0 : 1,
    })} jt`
  }
  if (compact && Math.abs(amount) >= 1_000) {
    return `Rp ${(amount / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 0,
    })} rb`
  }
  return `Rp ${amount.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`
}

export function formatNumber(value: number): string {
  return value.toLocaleString("id-ID")
}

export function formatDistanceKm(km: number): string {
  return `${km % 1 === 0 ? km : km.toFixed(1)} km`
}

export function formatElevation(meters: number): string {
  return `${meters.toLocaleString("id-ID")} m`
}

export function formatCutoff(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} menit`
  if (rest === 0) return `${hours} jam`
  return `${hours} jam ${rest} menit`
}

export function formatCountdown(target: string | Date | null | undefined): string {
  const date = toDate(target)
  if (!date) return "—"
  const diff = date.getTime() - Date.now()
  if (diff <= 0) return "Kedaluwarsa"
  const totalMinutes = Math.floor(diff / 60_000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days} hari ${hours} jam`
  if (hours > 0) return `${hours} jam ${minutes} menit`
  return `${minutes} menit`
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function percent(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((value / total) * 100))
}
