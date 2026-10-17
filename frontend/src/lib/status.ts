/**
 * Kelas warna & ikon untuk seluruh nilai status di ERD.
 * Netral (tema-agnostik) agar tetap terbaca di light mode.
 */
const NEUTRAL = "text-slate-600 border-slate-300 bg-slate-500/10 dark:text-slate-300 dark:border-slate-400/40 dark:bg-slate-400/10"
const AMBER = "text-amber-700 border-amber-400 bg-amber-400/15 dark:text-amber-300 dark:border-amber-400/40 dark:bg-amber-400/10"
const SKY = "text-sky-700 border-sky-400 bg-sky-400/15 dark:text-sky-300 dark:border-sky-400/40 dark:bg-sky-400/10"
const EMERALD = "text-emerald-700 border-emerald-400 bg-emerald-400/15 dark:text-emerald-300 dark:border-emerald-400/40 dark:bg-emerald-400/10"
const ROSE = "text-rose-700 border-rose-400 bg-rose-400/15 dark:text-rose-300 dark:border-rose-400/40 dark:bg-rose-400/10"
const VIOLET = "text-violet-700 border-violet-400 bg-violet-400/15 dark:text-violet-300 dark:border-violet-400/40 dark:bg-violet-400/10"
const ORANGE = "text-orange-700 border-orange-400 bg-orange-400/15 dark:text-orange-300 dark:border-orange-400/40 dark:bg-orange-400/10"
const YELLOW = "text-yellow-700 border-yellow-400 bg-yellow-400/15 dark:text-yellow-300 dark:border-yellow-400/40 dark:bg-yellow-400/10"

export const STATUS_CLASS: Record<string, string> = {
  // Registrations
  pending_verification: AMBER,
  approved: SKY,
  awaiting_payment: AMBER,
  paid: EMERALD,
  rejected: ROSE,
  expired: NEUTRAL,
  waitlisted: VIOLET,
  cancelled: NEUTRAL,
  refunded: ORANGE,
  checked_in: EMERALD,
  // Events
  draft: NEUTRAL,
  pending_review: YELLOW,
  published: EMERALD,
  registration_closed: SKY,
  completed: EMERALD,
  suspended: ORANGE,
  // Payments
  pending: AMBER,
  failed: ROSE,
  partially_refunded: ORANGE,
  // Verification
  verified: EMERALD,
  // Disbursements
  eligible: SKY,
  held: ROSE,
  // Disputes
  open: AMBER,
  in_review: SKY,
  resolved: EMERALD,
  // Tickets & misc
  issued: EMERALD,
  used: NEUTRAL,
  revoked: ROSE,
  requested: AMBER,
  processing: SKY,
  refund_failed: ROSE,
  invited: SKY,
  active: EMERALD,
  disabled: NEUTRAL,
}

export function statusClass(status: string): string {
  return STATUS_CLASS[status] ?? NEUTRAL
}

/** True jika status dianggap "siap maju"/selesai positif. */
export function isPositiveStatus(status: string): boolean {
  return ["paid", "checked_in", "published", "verified", "resolved", "approved"].includes(status)
}

export function isPendingStatus(status: string): boolean {
  return ["pending_verification", "awaiting_payment", "pending_review", "pending", "in_review", "requested", "processing"].includes(status)
}

export function isClosedStatus(status: string): boolean {
  return ["expired", "rejected", "cancelled", "failed", "revoked", "refund_failed"].includes(status)
}
