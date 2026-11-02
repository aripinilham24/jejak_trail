import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  useApproveRegistration,
  useOrganizerRegistrations,
  useRejectRegistration,
} from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort } from "@/lib/format"

export function OrganizerVerificationsPage() {
  const { t } = useTranslation()
  const query = useOrganizerRegistrations({ status: "pending_verification", limit: 100 })
  const approve = useApproveRegistration()
  const reject = useRejectRegistration()

  async function handleApprove(id: string) {
    try {
      const reg = await approve.mutateAsync(id)
      toast.success(`Pendaftaran ${reg.fullNameSnapshot} disetujui`)
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt("Alasan penolakan")
    if (!reason?.trim()) return
    try {
      await reject.mutateAsync({ id, reason })
      toast.success("Pendaftaran ditolak")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

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
      accessorKey: "submittedAt",
      header: "Dikirim",
      cell: (value) => (value ? formatDateShort(String(value)) : "-"),
    },
    {
      accessorKey: "id",
      header: "",
      cell: (_value, row) => (
        <div className="flex justify-end gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to={`/organizer/verifications/${row.id}`}>Lihat</Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={reject.isPending}
            onClick={() => void handleReject(String(row.id))}
          >
            Tolak
          </Button>
          <Button
            size="sm"
            disabled={approve.isPending}
            onClick={() => void handleApprove(String(row.id))}
          >
            Setujui
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading>{t("organizer.verifications")}</Heading>
        <Badge variant="outline">{query.data?.meta.total ?? 0} menunggu</Badge>
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
