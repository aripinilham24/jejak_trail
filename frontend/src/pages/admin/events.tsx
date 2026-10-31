import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"
import { useAdminEvents, useReviewEvent } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"

export function AdminEventsPage() {
  const { t } = useTranslation()
  const eventsQuery = useAdminEvents({ limit: 100 })
  const review = useReviewEvent()

  async function handleReview(id: string, approve: boolean) {
    let note = ""
    if (!approve) {
      note = window.prompt("Catatan revisi untuk organizer") ?? ""
      if (!note.trim()) return
    }
    try {
      await review.mutateAsync({ id, approve, note })
      toast.success(approve ? "Event dipublikasikan" : "Event dikembalikan ke draft")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const columns: Column[] = [
    { accessorKey: "title", header: "Event" },
    {
      accessorKey: "organizerName",
      header: "Organizer",
    },
    {
      accessorKey: "city",
      header: "Kota",
      cell: (_value, row) => `${row.city}, ${row.province}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (value) => (
        <Badge variant={value === "pending_review" ? "default" : "outline"}>
          {String(value)}
        </Badge>
      ),
    },
    {
      accessorKey: "id",
      header: "",
      cell: (_value, row) =>
        row.status === "pending_review" ? (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={review.isPending}
              onClick={() => void handleReview(String(row.id), false)}
            >
              Minta revisi
            </Button>
            <Button
              size="sm"
              disabled={review.isPending}
              onClick={() => void handleReview(String(row.id), true)}
            >
              Setujui
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <Heading>{t("admin.eventCuration")}</Heading>

      {eventsQuery.isError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage(eventsQuery.error)}
        </p>
      )}

      <DataTable
        columns={columns}
        data={(eventsQuery.data?.data ?? []) as unknown as Record<string, any>[]}
      />
    </div>
  )
}
