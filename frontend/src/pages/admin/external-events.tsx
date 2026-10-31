import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Heading } from "@/components/ui/heading"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { DataTable, type Column } from "@/components/ui/data-table"
import {
  useAdminEvents,
  useCreateExternalEvent,
  useDeleteExternalEvent,
} from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"
import { formatDateShort } from "@/lib/format"
import type { Event } from "@/types"

const emptyForm = {
  title: "",
  description: "",
  locationName: "",
  province: "",
  city: "",
  eventStartAt: "",
  eventEndAt: "",
  externalUrl: "",
}

export function AdminExternalEventsPage() {
  const { t } = useTranslation()
  const eventsQuery = useAdminEvents({ type: "external", limit: 100 })
  const createEvent = useCreateExternalEvent()
  const deleteEvent = useDeleteExternalEvent()

  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createEvent.mutateAsync({
        ...form,
        latitude: 0,
        longitude: 0,
        eventStartAt: new Date(form.eventStartAt).toISOString(),
        eventEndAt: new Date(form.eventEndAt).toISOString(),
      })
      toast.success("Event eksternal ditambahkan")
      setForm(emptyForm)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDelete(event: Event) {
    if (!window.confirm(`Hapus event "${event.title}"?`)) return
    try {
      await deleteEvent.mutateAsync(event.id)
      toast.success("Event eksternal dihapus")
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  const columns: Column[] = [
    { accessorKey: "title", header: "Event" },
    {
      accessorKey: "city",
      header: "Lokasi",
      cell: (_value, row) => `${row.city}, ${row.province}`,
    },
    {
      accessorKey: "eventStartAt",
      header: "Tanggal",
      cell: (value) => formatDateShort(String(value)),
    },
    {
      accessorKey: "externalUrl",
      header: "URL",
      cell: (value) =>
        value ? (
          <a
            href={String(value)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-amber-600 underline dark:text-amber-400"
          >
            Buka
          </a>
        ) : (
          "—"
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      accessorKey: "id",
      header: "",
      cell: (_value, row) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => void handleDelete(row as Event)}
        >
          Hapus
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <Heading>{t("admin.externalEvents")}</Heading>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah event eksternal</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => update("title", event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="locationName">Nama lokasi</Label>
              <Input
                id="locationName"
                value={form.locationName}
                onChange={(event) => update("locationName", event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="province">Provinsi</Label>
              <Input
                id="province"
                value={form.province}
                onChange={(event) => update("province", event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="city">Kota</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(event) => update("city", event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="externalUrl">URL pendaftaran</Label>
              <Input
                id="externalUrl"
                type="url"
                placeholder="https://"
                value={form.externalUrl}
                onChange={(event) => update("externalUrl", event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eventStartAt">Mulai</Label>
              <Input
                id="eventStartAt"
                type="datetime-local"
                value={form.eventStartAt}
                onChange={(event) => update("eventStartAt", event.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="eventEndAt">Selesai</Label>
              <Input
                id="eventEndAt"
                type="datetime-local"
                value={form.eventEndAt}
                onChange={(event) => update("eventEndAt", event.target.value)}
                required
              />
            </div>
            {error && (
              <p className="sm:col-span-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={createEvent.isPending}>
                {createEvent.isPending ? "Menyimpan..." : "Tambah event"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {eventsQuery.isError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorMessage(eventsQuery.error)}
        </p>
      )}

      <DataTable columns={columns} data={(eventsQuery.data?.data ?? []) as unknown as Record<string, any>[]} />
    </div>
  )
}
