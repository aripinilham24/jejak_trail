import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { CheckCircle2, Download, Loader2, RefreshCcw, ScanLine, WifiOff } from "lucide-react"
import { Heading } from "@/components/ui/heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useCheckinManifest,
  useOrganizerEvents,
  useScanCheckin,
  useSyncCheckins,
  type CheckinResult,
  type CheckinScanInput,
} from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateTime } from "@/lib/format"

interface QueuedScan extends CheckinScanInput {
  clientId: string
  scannedAt: string
  createdAt: string
}

export function OrganizerCheckinPage() {
  const { t } = useTranslation()
  const eventsQuery = useOrganizerEvents({ limit: 100 })
  const [eventId, setEventId] = useState("")
  const manifestQuery = useCheckinManifest(eventId)
  const scan = useScanCheckin()
  const sync = useSyncCheckins()

  const [qrCode, setQrCode] = useState("")
  const [pickupType, setPickupType] = useState<"self" | "representative">("self")
  const [representativeName, setRepresentativeName] = useState("")
  const [representativeNote, setRepresentativeNote] = useState("")
  const [offline, setOffline] = useState(false)
  const [queue, setQueue] = useState<QueuedScan[]>([])
  const [result, setResult] = useState<CheckinResult | null>(null)
  const [search, setSearch] = useState("")

  const events = (eventsQuery.data?.data ?? []).filter((event) =>
    ["published", "registration_closed", "completed"].includes(event.status),
  )
  const manifest = manifestQuery.data

  useEffect(() => {
    if (!eventId) {
      setQueue([])
      return
    }
    try {
      const raw = window.localStorage.getItem(`jt-checkin-queue-${eventId}`)
      setQueue(raw ? (JSON.parse(raw) as QueuedScan[]) : [])
    } catch {
      setQueue([])
    }
  }, [eventId])

  useEffect(() => {
    if (!eventId) return
    try {
      window.localStorage.setItem(`jt-checkin-queue-${eventId}`, JSON.stringify(queue))
    } catch {
      // abaikan storage penuh
    }
  }, [eventId, queue])

  const filtered = useMemo(() => {
    const pool = manifest?.participants ?? []
    const query = search.trim().toLowerCase()
    if (!query) return pool
    return pool.filter((participant) =>
      `${participant.fullName} ${participant.bibNumber ?? ""} ${participant.categoryName}`
        .toLowerCase()
        .includes(query),
    )
  }, [manifest, search])

  async function handleScan() {
    if (!qrCode.trim()) return
    const code = qrCode.trim()

    if (offline) {
      const participant = manifest?.participants.find((item) => item.qrCode === code)
      if (!participant) {
        setResult({ status: "invalid", message: "QR tidak ditemukan pada manifest offline." })
        return
      }
      if (participant.checkin) {
        setResult({
          status: "already_checked_in",
          message: `QR sudah dipindai pada ${formatDateTime(participant.checkin.scannedAt)}.`,
          participant,
        })
        return
      }
      if (queue.some((item) => item.qrCode === code)) {
        setResult({ status: "already_checked_in", message: "QR sudah ada di antrean offline.", participant })
        return
      }
      const queued: QueuedScan = {
        qrCode: code,
        pickupType,
        representativeName: pickupType === "representative" ? representativeName : undefined,
        representativeNote: pickupType === "representative" ? representativeNote : undefined,
        clientId: crypto.randomUUID(),
        createdOffline: true,
        scannedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      }
      setQueue((prev) => [...prev, queued])
      setResult({
        status: "checked_in",
        message: `${participant.fullName} — BIB ${participant.bibNumber ?? "-"} disimpan offline.`,
        participant,
      })
      setQrCode("")
      return
    }

    try {
      const res = await scan.mutateAsync({
        qrCode: code,
        pickupType,
        representativeName: pickupType === "representative" ? representativeName : undefined,
        representativeNote: pickupType === "representative" ? representativeNote : undefined,
      })
      setResult(res)
      if (res.status === "checked_in") toast.success(res.message)
      else if (res.status === "already_checked_in") toast.warning(res.message)
      else toast.error(res.message)
      setQrCode("")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  async function handleSync() {
    if (queue.length === 0) return
    try {
      const res = await sync.mutateAsync(
        queue.map((item) => ({
          qrCode: item.qrCode,
          pickupType: item.pickupType,
          representativeName: item.representativeName,
          representativeNote: item.representativeNote,
          clientId: item.clientId,
          createdOffline: true,
          scannedAt: item.scannedAt,
        })),
      )
      const success = res.results.filter((item) => item.status === "checked_in" || item.status === "already_checked_in")
      const failed = res.results.filter((item) => item.status === "invalid")
      const successCodes = new Set(success.map((item) => item.participant?.qrCode))
      setQueue((prev) => prev.filter((item) => !successCodes.has(item.qrCode)))
      toast.success(`${success.length} check-in tersinkron, ${failed.length} gagal.`)
      if (failed.length > 0) setResult(failed[0])
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  function downloadManifest() {
    if (!manifest) return
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `manifest-${manifest.eventId}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading>{t("organizer.checkin")}</Heading>
        {manifest && (
          <Button variant="outline" onClick={downloadManifest}>
            <Download className="mr-2 size-4" />
            Unduh manifest
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <Label>Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <input type="checkbox" checked={offline} onChange={(e) => setOffline(e.target.checked)} />
              <WifiOff className="size-4" />
              Mode offline
            </label>
          </div>
        </CardContent>
      </Card>

      {manifest && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total peserta</p>
              <p className="font-mono text-2xl font-semibold">{manifest.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Sudah check-in</p>
              <p className="font-mono text-2xl font-semibold text-emerald-600 dark:text-emerald-300">
                {manifest.checkedIn}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Antrean offline</p>
              <p className="font-mono text-2xl font-semibold text-amber-600 dark:text-amber-300">
                {queue.length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Scan QR</CardTitle>
          {queue.length > 0 && (
            <Button size="sm" disabled={sync.isPending} onClick={() => void handleSync()}>
              {sync.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCcw className="mr-2 size-4" />}
              Sinkronkan {queue.length}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="qrCode">Kode QR</Label>
              <Input
                id="qrCode"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleScan()
                }}
                placeholder="Tempel/scan kode QR tiket"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Pengambilan</Label>
              <Select value={pickupType} onValueChange={(value) => setPickupType(value as typeof pickupType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Diambil sendiri</SelectItem>
                  <SelectItem value="representative">Diwakilkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {pickupType === "representative" && (
              <div className="grid gap-2">
                <Label htmlFor="representativeName">Nama perwakilan</Label>
                <Input
                  id="representativeName"
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                />
              </div>
            )}
            {pickupType === "representative" && (
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="representativeNote">Catatan (surat kuasa, dsb.)</Label>
                <Input
                  id="representativeNote"
                  value={representativeNote}
                  onChange={(e) => setRepresentativeNote(e.target.value)}
                />
              </div>
            )}
          </div>

          <Button disabled={scan.isPending || !eventId} onClick={() => void handleScan()}>
            {scan.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ScanLine className="mr-2 size-4" />}
            Check-in
          </Button>

          {result && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                result.status === "checked_in"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : result.status === "already_checked_in"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
            >
              <p className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4" />
                {result.message}
              </p>
              {result.participant && (
                <p className="mt-1 text-xs">
                  {result.participant.fullName} · BIB {result.participant.bibNumber ?? "-"} ·{" "}
                  {result.participant.categoryName}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manifest peserta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, BIB, atau kategori"
          />
          {manifestQuery.isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-amber-500" />
            </div>
          )}
          <div className="max-h-[520px] overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-2 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Nama</th>
                  <th className="px-3 py-2 font-medium">BIB</th>
                  <th className="px-3 py-2 font-medium">Kategori</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Check-in</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((participant) => (
                  <tr key={participant.ticketId} className="border-t border-border/60">
                    <td className="px-3 py-2 font-medium">{participant.fullName}</td>
                    <td className="px-3 py-2 font-mono text-xs">{participant.bibNumber ?? "-"}</td>
                    <td className="px-3 py-2">{participant.categoryName}</td>
                    <td className="px-3 py-2">
                      <Badge variant={participant.checkin ? "default" : "outline"}>
                        {participant.checkin ? "checked_in" : participant.ticketStatus}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {participant.checkin
                        ? `${formatDateTime(participant.checkin.scannedAt)}${
                            participant.checkin.createdOffline ? " · offline" : ""
                          }`
                        : "-"}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !manifestQuery.isLoading && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                      Tidak ada peserta. Pilih event yang sudah memiliki tiket terbit.
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
