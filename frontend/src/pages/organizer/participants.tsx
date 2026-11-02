import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Heading } from "@/components/ui/heading"
import { DataTable, type Column } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { useExportParticipants, useOrganizerEvents, useOrganizerRegistrations } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort } from "@/lib/format"

export function OrganizerParticipantsPage() {
  const { t } = useTranslation()
  const query = useOrganizerRegistrations({ limit: 100 })
  const eventsQuery = useOrganizerEvents({ limit: 100 })
  const exportParticipants = useExportParticipants()
  const [eventId, setEventId] = useState("")

  const columns: Column[] = [
    { accessorKey: "fullNameSnapshot", header: "Peserta" },
    {
      accessorKey: "event",
      header: "Event",
      cell: (_value, row) => row.event?.title ?? "-",
    },
    {
      accessorKey: "category",
      header: "Kategori",
      cell: (_value, row) => row.category?.name ?? "-",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (value) => <StatusBadge status={String(value)} />,
    },
    {
      accessorKey: "submittedAt",
      header: "Dikirim",
      cell: (value) => (value ? formatDateShort(String(value)) : "-"),
    },
    {
      accessorKey: "payment",
      header: "Pembayaran",
      cell: (_value, row) => row.payment?.status ?? "-",
    },
  ]

  async function handleExport() {
    if (!eventId) {
      toast.error("Pilih event terlebih dahulu")
      return
    }
    const event = eventsQuery.data?.data.find((item) => item.id === eventId)
    try {
      await exportParticipants.mutateAsync({
        eventId,
        filename: `${event?.slug ?? "event"}-participants.csv`,
      })
      toast.success("CSV peserta diunduh")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading>{t("organizer.participants")}</Heading>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Pilih event" />
            </SelectTrigger>
            <SelectContent>
              {(eventsQuery.data?.data ?? []).map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={exportParticipants.isPending || !eventId} onClick={() => void handleExport()}>
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {query.isError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage(query.error)}
        </p>
      )}

      <DataTable
        columns={columns}
        data={(query.data?.data ?? []) as unknown as Record<string, any>[]}
      />
    </div>
  )
}
