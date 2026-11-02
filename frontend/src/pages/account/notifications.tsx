import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateTime } from "@/lib/format"

export function AccountNotificationsPage() {
  const { t } = useTranslation()
  const query = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  async function handleMarkAll() {
    try {
      await markAll.mutateAsync()
      toast.success("Semua notifikasi ditandai sudah dibaca")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading>{t("account.notifications")}</Heading>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{query.data?.meta.unread ?? 0} belum dibaca</Badge>
          <Button variant="outline" size="sm" disabled={markAll.isPending} onClick={() => void handleMarkAll()}>
            <CheckCheck className="mr-2 size-4" />
            Tandai semua
          </Button>
        </div>
      </div>

      {query.isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="size-6 animate-spin text-amber-500" />
        </div>
      )}

      {query.isError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage(query.error)}
        </p>
      )}

      <div className="space-y-3">
        {(query.data?.data ?? []).map((notification) => {
          const unread = !notification.readAt
          return (
            <Card key={notification.id} className={unread ? "border-amber-500/30" : undefined}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="flex gap-3">
                  <span className={`mt-1 grid size-8 shrink-0 place-items-center rounded-full ${unread ? "bg-amber-500/15 text-amber-600 dark:text-amber-300" : "bg-surface-2 text-muted-foreground"}`}>
                    <Bell className="size-4" />
                  </span>
                  <div>
                    <CardTitle className="text-sm">{notification.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(notification.createdAt)} · {notification.channel}
                    </p>
                  </div>
                </div>
                {unread && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={markRead.isPending}
                    onClick={() => void markRead.mutateAsync(notification.id)}
                  >
                    Tandai dibaca
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{notification.body}</p>
              </CardContent>
            </Card>
          )
        })}
        {!query.isLoading && (query.data?.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Tidak ada notifikasi.</p>
        )}
      </div>
    </div>
  )
}
