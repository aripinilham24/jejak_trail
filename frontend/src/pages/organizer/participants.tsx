import { useTranslation } from "react-i18next"
import { Heading } from "@/components/ui/heading"
import { DataTable, type Column } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/shared/status-badge"
import { useOrganizerRegistrations } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort } from "@/lib/format"

export function OrganizerParticipantsPage() {
  const { t } = useTranslation()
  const query = useOrganizerRegistrations({ limit: 100 })

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

  return (
    <div className="space-y-6">
      <Heading>{t("organizer.participants")}</Heading>

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
