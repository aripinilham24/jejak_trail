import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { CalendarDays, Mail, MapPin } from "lucide-react"
import { Brand } from "@/components/layout/brand"
import { Separator } from "@/components/ui/separator"

export function PublicFooter() {
  const { t } = useTranslation()

  const columns = [
    {
      title: t("footer.forRunners"),
      links: [
        { to: "/events", label: t("nav.events") },
        { to: "/kalender", label: t("nav.calendar") },
        { to: "/akun", label: t("account.myRegistrations") },
        { to: "/akun/tiket", label: t("account.ticket") },
      ],
    },
    {
      title: t("footer.forOrganizers"),
      links: [
        { to: "/daftar/organizer", label: t("auth.registerOrganizer") },
        { to: "/organizer", label: t("nav.dashboard") },
        { to: "/organizer/verifikasi", label: t("organizer.verifications") },
        { to: "/organizer/keuangan", label: t("organizer.finance") },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { to: "/tentang", label: t("footer.privacy") },
        { to: "/tentang", label: t("footer.terms") },
        { to: "/tentang", label: t("footer.dispute") },
        { to: "/bantuan", label: t("footer.contact") },
      ],
    },
  ]

  return (
    <footer className="relative mt-16 border-t border-border bg-surface-2/40">
      <div className="topo-pattern pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-4">
            <Brand size="lg" />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("footer.tagline")}
            </p>
            <div className="flex items-center gap-2">
              {[CalendarDays, Mail, MapPin].map((Icon, index) => (
                <span
                  key={index}
                  className="grid size-9 place-items-center rounded-lg border border-border bg-background/60 text-muted-foreground"
                >
                  <Icon className="size-4" />
                </span>
              ))}
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              Jakarta · Bandung · Yogyakarta
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title} className="space-y-3">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
                {column.title}
              </p>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Jejak Trail. {t("footer.rights")}
          </p>
          <p className="max-w-xl sm:text-right">{t("footer.disclaimer")}</p>
        </div>
      </div>
    </footer>
  )
}
