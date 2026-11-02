import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdminDisputes, useReviewDispute } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateTime } from "@/lib/format"

export function AdminDisputesPage() {
  const { t } = useTranslation()
  const disputes = useAdminDisputes()
  const review = useReviewDispute()

  async function handleAction(id: string, action: "review" | "resolve" | "reject") {
    let resolution = ""
    if (action !== "review") {
      resolution = window.prompt("Resolusi / catatan") ?? ""
      if (!resolution.trim()) return
    }
    try {
      await review.mutateAsync({ id, action, resolution })
      toast.success("Status sengketa diperbarui")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <Heading>{t("admin.disputes")}</Heading>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar sengketa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(disputes.data?.data ?? []).map((item) => (
            <div key={item.id} className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.reporterName} · {item.eventTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.disputeType} · {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <Badge variant="outline">{item.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              {item.resolution && (
                <p className="mt-2 rounded-md bg-surface-2 px-3 py-2 text-xs">
                  Resolusi: {item.resolution}
                </p>
              )}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                {item.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => void handleAction(item.id, "review")}>
                    Tinjau
                  </Button>
                )}
                {(item.status === "open" || item.status === "in_review") && (
                  <>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => void handleAction(item.id, "reject")}>
                      Tolak
                    </Button>
                    <Button size="sm" onClick={() => void handleAction(item.id, "resolve")}>
                      Selesaikan
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {(disputes.data?.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Tidak ada sengketa.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
