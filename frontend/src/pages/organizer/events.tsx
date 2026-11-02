import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Plus } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"
import { useOrganizerEvents, useSubmitOrganizerEvent } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort } from "@/lib/format"

export function OrganizerEventsPage() {
  const { t } = useTranslation()
  const eventsQuery = useOrganizerEvents({ limit: 100 })
  const submit = useSubmitOrganizerEvent()

  async function handleSubmit(id: string) {
    if (!window.confirm("Kirim event ini untuk review admin?")) return
    try {
      await submit.mutateAsync(id)
      toast.success("Event dikirim untuk review")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const columns: Column[] = [
    { accessorKey: "title", header: "Event" },
    {
      accessorKey: "eventStartAt",
      header: "Tanggal",
      cell: (value) => formatDateShort(String(value)),
    },
    {
      accessorKey: "city",
      header: "Kota",
      cell: (_value, row) => `${row.city}, ${row.province}`,
    },
    {
      accessorKey: "categories",
      header: "Kategori",
      cell: (value) => (Array.isArray(value) ? value.length : 0),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (value) => (
        <Badge variant={value === "published" ? "default" : "outline"}>{String(value)}</Badge>
      ),
    },
    {
      accessorKey: "id",
      header: "",
      cell: (_value, row) => (
        <div className="flex justify-end gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={`/organizer/event-detail/${row.id}`}>Lihat</Link>
          </Button>
          {row.status === "draft" && (
            <Button size="sm" disabled={submit.isPending} onClick={() => void handleSubmit(String(row.id))}>
              Kirim review
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading>{t("organizer.events")}</Heading>
        <Button asChild>
          <Link to="/organizer/event-new">
            <Plus className="mr-2 size-4" />
            Buat event
          </Link>
        </Button>
      </div>

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
