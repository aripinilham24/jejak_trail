import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTable, type Column } from "@/components/ui/data-table"
import { useAdminOrganizations, useVerifyOrganization } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"

export function AdminOrganizationsPage() {
  const { t } = useTranslation()
  const orgsQuery = useAdminOrganizations({ limit: 100 })
  const verify = useVerifyOrganization()

  async function handleVerify(id: string, approve: boolean) {
    let reason = ""
    if (!approve) {
      reason = window.prompt("Alasan penolakan") ?? ""
      if (!reason.trim()) return
    }
    try {
      await verify.mutateAsync({ id, approve, reason })
      toast.success(approve ? "Organisasi diverifikasi" : "Organisasi ditolak")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const columns: Column[] = [
    { accessorKey: "name", header: "Organisasi" },
    {
      accessorKey: "city",
      header: "Kota",
      cell: (_value, row) => `${row.city}, ${row.province}`,
    },
    {
      accessorKey: "verificationStatus",
      header: "Status Verifikasi",
      cell: (value) => (
        <Badge
          variant="outline"
          className={
            value === "verified"
              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
              : value === "rejected"
                ? "border-destructive/40 text-destructive"
                : "border-amber-500/40 text-amber-600 dark:text-amber-300"
          }
        >
          {String(value)}
        </Badge>
      ),
    },
    { accessorKey: "eventCount", header: "Event" },
    {
      accessorKey: "id",
      header: "",
      cell: (_value, row) =>
        row.verificationStatus === "pending" ? (
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={verify.isPending}
              onClick={() => void handleVerify(String(row.id), false)}
            >
              Tolak
            </Button>
            <Button
              size="sm"
              disabled={verify.isPending}
              onClick={() => void handleVerify(String(row.id), true)}
            >
              Verifikasi
            </Button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <Heading>{t("admin.organizations")}</Heading>

      {orgsQuery.isError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage(orgsQuery.error)}
        </p>
      )}

      <DataTable
        columns={columns}
        data={(orgsQuery.data?.data ?? []) as unknown as Record<string, any>[]}
      />
    </div>
  )
}
