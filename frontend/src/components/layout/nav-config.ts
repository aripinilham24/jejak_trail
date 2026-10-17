import {
  BadgeCheck,
  Banknote,
  Bell,
  CalendarDays,
  ClipboardCheck,
  Gavel,
  GitCompareArrows,
  LayoutDashboard,
  LifeBuoy,
  QrCode,
  ScanLine,
  ScrollText,
  Ticket,
  Users,
  UserSquare2,
  FileText,
  Building2,
  Wallet,
  Undo2,
  Megaphone,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { AccountType } from "@/types"

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
  badgeKey?: "pendingVerifications" | "pendingOrgs" | "pendingEvents" | "openDisputes"
  end?: boolean
}

export const NAV_BY_ROLE: Record<AccountType, NavItem[]> = {
  attendee: [
    { to: "/akun", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
    { to: "/akun/pendaftaran", labelKey: "account.myRegistrations", icon: ClipboardCheck },
    { to: "/akun/tiket", labelKey: "account.ticket", icon: Ticket },
    { to: "/akun/dokumen", labelKey: "account.documents", icon: FileText },
    { to: "/akun/notifikasi", labelKey: "account.notifications", icon: Bell },
    { to: "/akun/profil", labelKey: "account.profile", icon: UserSquare2 },
  ],
  organizer: [
    { to: "/organizer", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
    { to: "/organizer/event", labelKey: "organizer.events", icon: CalendarDays },
    { to: "/organizer/verifikasi", labelKey: "organizer.verifications", icon: BadgeCheck, badgeKey: "pendingVerifications" },
    { to: "/organizer/peserta", labelKey: "organizer.participants", icon: Users },
    { to: "/organizer/checkin", labelKey: "organizer.checkin", icon: ScanLine },
    { to: "/organizer/pengumuman", labelKey: "organizer.announcements", icon: Megaphone },
    { to: "/organizer/keuangan", labelKey: "organizer.finance", icon: Wallet },
    { to: "/organizer/tim", labelKey: "organizer.team", icon: UserSquare2 },
    { to: "/organizer/profil", labelKey: "organizer.profile", icon: Building2 },
  ],
  admin: [
    { to: "/admin", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/organisasi", labelKey: "admin.organizations", icon: BadgeCheck, badgeKey: "pendingOrgs" },
    { to: "/admin/event", labelKey: "admin.eventCuration", icon: CalendarDays, badgeKey: "pendingEvents" },
    { to: "/admin/event-eksternal", labelKey: "admin.externalEvents", icon: GitCompareArrows },
    { to: "/admin/keuangan", labelKey: "admin.finance", icon: Banknote },
    { to: "/admin/refund", labelKey: "admin.refunds", icon: Undo2 },
    { to: "/admin/sengketa", labelKey: "admin.disputes", icon: Gavel, badgeKey: "openDisputes" },
    { to: "/admin/pengguna", labelKey: "admin.users", icon: Users },
    { to: "/admin/audit", labelKey: "admin.auditLogs", icon: ScrollText },
  ],
}

export const ROLE_LABEL_KEY: Record<AccountType, string> = {
  attendee: "roles.attendee",
  organizer: "roles.organizer",
  admin: "roles.admin",
}

export const ROLE_HOME: Record<AccountType, string> = {
  attendee: "/akun",
  organizer: "/organizer",
  admin: "/admin",
}

export const SUPPORT_ICON = LifeBuoy
export const QR_ICON = QrCode
