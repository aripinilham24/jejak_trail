import { useEffect, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { CalendarDays, Home, Info, Menu, Search, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { AccountSwitcher } from "@/components/layout/account-switcher"
import { Brand } from "@/components/layout/brand"
import { LanguageToggle } from "@/components/layout/language-toggle"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { cn } from "@/lib/utils"

const LINKS = [
  { to: "/", labelKey: "nav.home", icon: Home, end: true },
  { to: "/events", labelKey: "nav.events", icon: Trophy },
  { to: "/kalender", labelKey: "nav.calendar", icon: CalendarDays },
  { to: "/tentang", labelKey: "nav.about", icon: Info },
]

export function PublicHeader() {
  const { t } = useTranslation()
  const location = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-all duration-300",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-xl"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="shrink-0">
          <Brand />
        </Link>

        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                cn(
                  "relative rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {t(link.labelKey)}
                  {isActive && (
                    <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-amber-500" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden gap-2 rounded-full text-muted-foreground md:inline-flex"
          >
            <Link to="/events">
              <Search className="size-3.5" />
              <span className="max-w-[190px] truncate font-normal">{t("nav.search")}</span>
            </Link>
          </Button>

          <div className="hidden sm:block">
            <LanguageToggle compact />
          </div>
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          <div className="hidden sm:block">
            <AccountSwitcher />
          </div>

          <Button asChild size="sm" className="hidden rounded-full lg:inline-flex">
            <Link to="/daftar/organizer">
              <Badge variant="secondary" className="-ml-1 mr-1 h-5 rounded-full bg-amber-950/30 px-1.5 text-[10px] uppercase text-amber-100">
                Baru
              </Badge>
              {t("nav.forOrganizers")}
            </Link>
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("actions.openMenu")}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0">
              <SheetTitle className="sr-only">Navigasi</SheetTitle>
              <div className="flex h-full flex-col gap-4 p-4">
                <Brand />
                <nav className="flex flex-col gap-1">
                  {LINKS.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-accent/60",
                        )
                      }
                    >
                      <link.icon className="size-4" />
                      {t(link.labelKey)}
                    </NavLink>
                  ))}
                  <Link
                    to="/daftar/organizer"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent/60"
                  >
                    <Trophy className="size-4" />
                    {t("nav.forOrganizers")}
                  </Link>
                </nav>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-4">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
                <AccountSwitcher />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
