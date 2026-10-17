import { useTranslation } from "react-i18next"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface DataPaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  className?: string
}

export function DataPagination({ page, pageCount, onPageChange, className }: DataPaginationProps) {
  const { t } = useTranslation()
  if (pageCount <= 1) return null

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter((p) => {
    if (pageCount <= 7) return true
    return p === 1 || p === pageCount || Math.abs(p - page) <= 1
  })

  return (
    <div className={cn("flex items-center justify-between gap-3 pt-4", className)}>
      <p className="text-xs text-muted-foreground">
        {t("common.page")} {page} {t("common.of")} {pageCount}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
        {pages.map((p, index) => {
          const prev = pages[index - 1]
          const gap = prev !== undefined && p - prev > 1
          return (
            <span key={p} className="flex items-center gap-1">
              {gap && <span className="px-1 text-xs text-muted-foreground">…</span>}
              <Button
                variant={p === page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className="font-mono text-xs"
              >
                {p}
              </Button>
            </span>
          )
        })}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
