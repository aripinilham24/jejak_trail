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
    { to: "/account", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
    { to: "/account/registrations", labelKey: "account.myRegistrations", icon: ClipboardCheck },
    { to: "/account/tickets", labelKey: "account.ticket", icon: Ticket },
    { to: "/account/documents", labelKey: "account.documents", icon: FileText },
    { to: "/account/notifications", labelKey: "account.notifications", icon: Bell },
    { to: "/account/profile", labelKey: "account.profile", icon: UserSquare2 },
  ],
  organizer: [
    { to: "/organizer", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
    { to: "/organizer/events", labelKey: "organizer.events", icon: CalendarDays },
    { to: "/organizer/verifications", labelKey: "organizer.verifications", icon: BadgeCheck, badgeKey: "pendingVerifications" },
    { to: "/organizer/participants", labelKey: "organizer.participants", icon: Users },
    { to: "/organizer/checkin", labelKey: "organizer.checkin", icon: ScanLine },
    { to: "/organizer/announcements", labelKey: "organizer.announcements", icon: Megaphone },
    { to: "/organizer/finance", labelKey: "organizer.finance", icon: Wallet },
    { to: "/organizer/team", labelKey: "organizer.team", icon: UserSquare2 },
    { to: "/organizer/profile", labelKey: "organizer.profile", icon: Building2 },
  ],
  admin: [
    { to: "/admin", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/organizations", labelKey: "admin.organizations", icon: BadgeCheck, badgeKey: "pendingOrgs" },
    { to: "/admin/events", labelKey: "admin.eventCuration", icon: CalendarDays, badgeKey: "pendingEvents" },
    { to: "/admin/external-events", labelKey: "admin.externalEvents", icon: GitCompareArrows },
    { to: "/admin/finance", labelKey: "admin.finance", icon: Banknote },
    { to: "/admin/refunds", labelKey: "admin.refunds", icon: Undo2 },
    { to: "/admin/disputes", labelKey: "admin.disputes", icon: Gavel, badgeKey: "openDisputes" },
    { to: "/admin/users", labelKey: "admin.users", icon: Users },
    { to: "/admin/audit", labelKey: "admin.auditLogs", icon: ScrollText },
  ],
}

export const ROLE_LABEL_KEY: Record<AccountType, string> = {
  attendee: "roles.attendee",
  organizer: "roles.organizer",
  admin: "roles.admin",
}

export const ROLE_HOME: Record<AccountType, string> = {
  attendee: "/account",
  organizer: "/organizer",
  admin: "/admin",
}

export const SUPPORT_ICON = LifeBuoy
export const QR_ICON = QrCode
