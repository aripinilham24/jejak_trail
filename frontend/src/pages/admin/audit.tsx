import { useTranslation } from "react-i18next"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuditLogs } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateTime } from "@/lib/format"

export function AdminAuditPage() {
  const { t } = useTranslation()
  const logs = useAuditLogs({ limit: 100 })

  return (
    <div className="space-y-6">
      <Heading>{t("admin.auditLogs")}</Heading>

      {logs.isError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage(logs.error)}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log audit ({logs.data?.meta.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">Waktu</th>
                  <th className="pb-2 font-medium">Aktor</th>
                  <th className="pb-2 font-medium">Aksi</th>
                  <th className="pb-2 font-medium">Entitas</th>
                  <th className="pb-2 font-medium">IP</th>
                  <th className="pb-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {(logs.data?.data ?? []).map((log) => (
                  <tr key={log.id} className="border-t border-border/60 align-top">
                    <td className="py-2 text-muted-foreground">{formatDateTime(log.createdAt)}</td>
                    <td className="py-2">
                      <p className="font-medium">{log.actorName}</p>
                      <Badge variant="outline" className="mt-1">{log.actorType}</Badge>
                    </td>
                    <td className="py-2 font-mono text-xs">{log.action}</td>
                    <td className="py-2 text-xs">{log.entityType}</td>
                    <td className="py-2 text-xs text-muted-foreground">{log.ipAddress ?? "-"}</td>
                    <td className="py-2">
                      {(log.before || log.after) ? (
                        <details>
                          <summary className="cursor-pointer text-xs text-amber-600 dark:text-amber-400">Lihat</summary>
                          <pre className="mt-2 max-w-xs overflow-auto rounded bg-surface-2 p-2 text-[10px]">
                            {JSON.stringify({ before: log.before, after: log.after }, null, 2)}
                          </pre>
                        </details>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
                {(logs.data?.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">
                      Belum ada log audit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
