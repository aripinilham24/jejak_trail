import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { QRCodeSVG } from "qrcode.react"
import { Loader2 } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useMyTickets } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort } from "@/lib/format"

export function AccountTicketsPage() {
  const { t } = useTranslation()
  const query = useMyTickets()

  return (
    <>
      <Heading className="mb-6">{t("account.ticket")}</Heading>

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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(query.data?.data ?? []).map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{ticket.eventTitle}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateShort(ticket.eventStartAt)} · {ticket.categoryName}
                </p>
              </div>
              <Badge variant="outline">{ticket.status}</Badge>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="rounded-lg bg-white p-2">
                <QRCodeSVG value={ticket.qrCode} size={96} />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted-foreground">BIB</span>
                <span className="font-mono text-sm font-semibold">{ticket.bibNumber ?? "-"}</span>
                <span className="truncate font-mono text-[10px] text-muted-foreground">{ticket.qrCode}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/account/tickets/${ticket.id}`}>{t("actions.viewDetail")}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
        {!query.isLoading && (query.data?.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada tiket. Tiket terbit setelah pembayaran lunas.</p>
        )}
      </div>
    </>
  )
}
