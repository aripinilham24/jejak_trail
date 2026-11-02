import { Link, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { QRCodeSVG } from "qrcode.react"
import { Loader2, MapPin } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useMyTicket } from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateTime } from "@/lib/format"

export function AccountTicketDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const query = useMyTicket(id)
  const ticket = query.data

  if (query.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <>
        <Heading className="mb-6">Tiket tidak ditemukan</Heading>
        <p className="text-muted-foreground">
          {query.isError ? errorMessage(query.error) : "Tiket belum diterbitkan."}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/account/tickets">{t("actions.back")}</Link>
        </Button>
      </>
    )
  }

  return (
    <>
      <Heading className="mb-6">Tiket Digital</Heading>
      <Card className="mx-auto max-w-lg">
        <CardHeader className="flex flex-col items-center justify-center text-center">
          <CardTitle className="text-2xl font-bold">{ticket.eventTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {formatDateTime(ticket.eventStartAt)} · {ticket.categoryName}
          </p>
          <Badge variant={ticket.status === "used" ? "secondary" : "default"} className="mt-2">
            {ticket.status}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4 p-8">
          <div className="rounded-xl bg-white p-4">
            <QRCodeSVG value={ticket.qrCode} size={220} />
          </div>
          <p className="break-all text-center font-mono text-xs text-muted-foreground">{ticket.qrCode}</p>
          <div className="grid w-full grid-cols-2 gap-3 rounded-xl border border-border p-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">BIB</p>
              <p className="font-mono font-semibold">{ticket.bibNumber ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Peserta</p>
              <p className="font-medium">{ticket.fullName}</p>
            </div>
            <div className="col-span-2 flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 text-muted-foreground" />
              <p>
                {ticket.locationName}, {ticket.city}, {ticket.province}
              </p>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Tunjukkan QR ini saat pengambilan racepack. QR hanya berlaku untuk satu peserta.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" asChild>
            <Link to="/account/tickets">{t("actions.back")}</Link>
          </Button>
        </CardFooter>
      </Card>
    </>
  )
}
