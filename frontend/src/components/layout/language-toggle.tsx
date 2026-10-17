import { useTranslation } from "react-i18next"
import { Languages } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage === "en" ? "en" : "id"

  const change = (lng: "id" | "en") => {
    void i18n.changeLanguage(lng)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          className={compact ? "" : "gap-2"}
          aria-label={t("language.label")}
        >
          <Languages className="size-4" />
          {!compact && <span className="font-mono text-xs uppercase">{current}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => change("id")}>
          <span className={current === "id" ? "font-semibold" : ""}>{t("language.id")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => change("en")}>
          <span className={current === "en" ? "font-semibold" : ""}>{t("language.en")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
