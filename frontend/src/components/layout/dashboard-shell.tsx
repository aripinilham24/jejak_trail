import { useState } from "react"
import { Link, NavLink, Outlet } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { ExternalLink, LifeBuoy, Menu, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { AccountSwitcher } from "@/components/layout/account-switcher"
import { Brand } from "@/components/layout/brand"
import { LanguageToggle } from "@/components/layout/language-toggle"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { NAV_BY_ROLE } from "@/components/layout/nav-config"
import { useDb } from "@/lib/mock/store"
import { useIdentity } from "@/lib/session"
import { cn } from "@/lib/utils"
import type { AccountType } from "@/types"

interface DashboardShellProps {
  role: AccountType
  children?: React.ReactNode
  /** deskripsi singkat di bawah brand */
  contextLabel?: string
}

function useBadges(role: AccountType): Partial<Record<string, number>> {
  const db = useDb()
  const identity = useIdentity()

  if (role === "organizer") {
    const eventIds = new Set(
      db.events.filter((e) => e.organizationId === identity.organization.id).map((e) => e.id),
    )
    return {
      pendingVerifications: db.registrations.filter(
        (r) => eventIds.has(r.eventId) && r.status === "pending_verification",
      ).length,
    }
  }
  if (role === "admin") {
    return {
      pendingOrgs: db.organizations.filter((o) => o.verificationStatus === "pending").length,
      pendingEvents: db.events.filter((e) => e.status === "pending_review").length,
      openDisputes: db.disputes.filter((d) => d.status === "open" || d.status === "in_review").length,
    }
  }
  return {}
}

function NavList({ role, onNavigate }: { role: AccountType; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const badges = useBadges(role)
  const items = NAV_BY_ROLE[role]

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const badge = item.badgeKey ? badges[item.badgeKey] : undefined
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-amber-500" />
                )}
                <item.icon
                  className={cn("size-4 shrink-0", isActive && "text-amber-500 dark:text-amber-400")}
                />
                <span className="truncate">{t(item.labelKey)}</span>
                {badge ? (
                  <Badge
                    variant="secondary"
                    className="ml-auto h-5 min-w-5 justify-center rounded-full bg-amber-500/15 px-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                  >
                    {badge}
                  </Badge>
                ) : null}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

function SidebarBody({
  role,
  contextLabel,
  onNavigate,
}: {
  role: AccountType
  contextLabel?: string
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const identity = useIdentity()

  const contextTitle =
    role === "attendee"
      ? t("account.title")
      : role === "organizer"
        ? identity.organization.name
        : t("admin.title")

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link to="/" className="rounded-lg p-1 transition-opacity hover:opacity-90">
        <Brand />
      </Link>

      <div className="rounded-lg border border-border/70 bg-surface-2/60 px-3 py-2.5">
        <p className="truncate font-display text-sm font-semibold">{contextTitle}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {contextLabel ??
            (role === "organizer"
              ? identity.organization.verificationStatus === "verified"
                ? t("status.verified")
                : t("status.pending")
              : t("common.tagline"))}
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <NavList role={role} onNavigate={onNavigate} />
      </ScrollArea>

      <Separator />
      <div className="flex flex-col gap-1">
        <Button asChild variant="ghost" size="sm" className="justify-start gap-2 text-muted-foreground">
          <Link to="/events" onClick={onNavigate}>
            <Search className="size-4" />
            {t("nav.events")}
            <ExternalLink className="ml-auto size-3.5" />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="justify-start gap-2 text-muted-foreground">
          <Link to="/bantuan" onClick={onNavigate}>
            <LifeBuoy className="size-4" />
            Pusat bantuan
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function DashboardShell({ role, children, contextLabel }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-svh bg-background">
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
          <SidebarBody role={role} contextLabel={contextLabel} />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md sm:px-5">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-sidebar p-0">
                <SheetTitle className="sr-only">Navigasi</SheetTitle>
                <SidebarBody role={role} contextLabel={contextLabel} onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <div className="lg:hidden">
              <Brand showWordmark={false} size="sm" />
            </div>

            <div className="ml-auto flex items-center gap-1">
              <LanguageToggle compact />
              <ThemeToggle />
              <AccountSwitcher />
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] px-3 pb-16 pt-5 sm:px-5 sm:pt-6">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>
    </div>
  )
}
