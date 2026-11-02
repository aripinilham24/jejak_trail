import { Link } from "react-router-dom"
import { Heading } from "@/components/ui/heading"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/status-badge"
import { useMyRegistrations } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort } from "@/lib/format"

export function AccountRegistrationsPage() {
  const registrations = useMyRegistrations()

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Heading>Pendaftaran saya</Heading>
        <Button asChild variant="outline">
          <Link to="/events">Cari event</Link>
        </Button>
      </div>

      {registrations.isError && (
        <p className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage(registrations.error)}
        </p>
      )}

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-3 font-medium">Event</th>
                  <th className="pb-3 font-medium">Kategori</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Tanggal</th>
                  <th className="pb-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {(registrations.data?.data ?? []).map((reg) => (
                  <tr key={reg.id} className="border-b border-border/50">
                    <td className="py-3">{reg.event?.title ?? "-"}</td>
                    <td className="py-3">{reg.category?.name ?? "-"}</td>
                    <td className="py-3">
                      <StatusBadge status={reg.status} />
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {reg.submittedAt ? formatDateShort(reg.submittedAt) : "-"}
                    </td>
                    <td className="py-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/account/registrations/${reg.id}`}>Detail</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
                {!registrations.isLoading && (registrations.data?.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Belum ada pendaftaran.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
