import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Megaphone } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useBroadcasts,
  useCreateBroadcast,
  useOrganizerEvents,
} from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateTime } from "@/lib/format"

export function OrganizerAnnouncementsPage() {
  const { t } = useTranslation()
  const eventsQuery = useOrganizerEvents({ limit: 100 })
  const [eventId, setEventId] = useState("")
  const broadcasts = useBroadcasts(eventId)
  const createBroadcast = useCreateBroadcast(eventId)

  const [channel, setChannel] = useState("email")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!eventId) {
      setError("Pilih event terlebih dahulu.")
      return
    }
    setError(null)
    try {
      const result = await createBroadcast.mutateAsync({ channel, subject, message })
      toast.success(`Pengumuman dikirim ke ${result.recipients} peserta`)
      setSubject("")
      setMessage("")
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="space-y-6">
      <Heading>{t("organizer.announcements")}</Heading>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kirim pengumuman</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Event</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger>
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
              </div>
              <div className="grid gap-2">
                <Label>Channel</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email + in-app</SelectItem>
                    <SelectItem value="in_app">In-app saja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subjek</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Pesan</Label>
              <Textarea id="message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
            </div>
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={createBroadcast.isPending || !eventId}>
              <Megaphone className="mr-2 size-4" />
              Kirim pengumuman
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <p className="text-sm font-medium">Riwayat pengumuman</p>
        {broadcasts.isError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage(broadcasts.error)}
          </p>
        )}
        {(broadcasts.data?.data ?? []).map((item) => (
          <Card key={item.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{item.subject}</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(item.sentAt)} · {item.recipients} penerima · {item.sentByName}
                </p>
              </div>
              <Badge variant="outline">{item.channel}</Badge>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p>
            </CardContent>
          </Card>
        ))}
        {eventId && !broadcasts.isLoading && (broadcasts.data?.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Belum ada pengumuman untuk event ini.</p>
        )}
      </div>
    </div>
  )
}
