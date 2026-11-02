import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Heading } from "@/components/ui/heading"
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
  useCreateOrganizerEvent,
  useSubmitOrganizerEvent,
  type OrganizerCategoryInput,
  type OrganizerEventInput,
  type OrganizerFormFieldInput,
  type OrganizerRefundPolicyInput,
} from "@/lib/api/hooks"
import { errorMessage } from "@/lib/auth/auth-context"

type CategoryForm = OrganizerCategoryInput & { requirementsText: string }
type FieldForm = Omit<OrganizerFormFieldInput, "options"> & { optionsText: string }

function newCategory(): CategoryForm {
  return {
    name: "",
    distanceKm: 0,
    elevationGainM: 0,
    difficulty: "moderate",
    price: 0,
    quota: 0,
    minAge: 18,
    cutoffMinutes: 0,
    requiresQualification: false,
    bibPrefix: "",
    bibStart: 1,
    bibEnd: 100,
    requirements: [],
    requirementsText: "",
  }
}

function newField(): FieldForm {
  return {
    fieldKey: "",
    label: "",
    fieldType: "text",
    isRequired: false,
    isSensitive: false,
    sortOrder: 1,
    optionsText: "",
  }
}

function defaultField(): FieldForm {
  return {
    fieldKey: "jersey_size",
    label: "Ukuran jersey",
    fieldType: "select",
    isRequired: true,
    isSensitive: false,
    sortOrder: 1,
    optionsText: "S, M, L, XL, XXL",
  }
}

function toISO(value: string) {
  return value ? new Date(value).toISOString() : ""
}

export function EventNewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const createEvent = useCreateOrganizerEvent()
  const submitEvent = useSubmitOrganizerEvent()

  const [basic, setBasic] = useState({
    title: "",
    description: "",
    locationName: "",
    province: "",
    city: "",
    latitude: 0,
    longitude: 0,
    eventStartAt: "",
    eventEndAt: "",
    registrationOpenAt: "",
    registrationCloseAt: "",
    terms: "",
    mandatoryGearText: "",
  })
  const [policy, setPolicy] = useState<OrganizerRefundPolicyInput>({
    name: "Kebijakan Refund Standar",
    policyType: "tiered",
    description: "",
    rules: [{ daysBeforeEventMin: 30, daysBeforeEventMax: null, refundPercent: 70 }],
  })
  const [categories, setCategories] = useState<CategoryForm[]>([newCategory()])
  const [fields, setFields] = useState<FieldForm[]>([defaultField()])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<"draft" | "review" | null>(null)

  function updateBasic<K extends keyof typeof basic>(key: K, value: (typeof basic)[K]) {
    setBasic((prev) => ({ ...prev, [key]: value }))
  }

  function updateCategory(index: number, patch: Partial<CategoryForm>) {
    setCategories((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function updateField(index: number, patch: Partial<FieldForm>) {
    setFields((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function buildPayload(): OrganizerEventInput {
    return {
      title: basic.title,
      description: basic.description,
      locationName: basic.locationName,
      province: basic.province,
      city: basic.city,
      latitude: basic.latitude,
      longitude: basic.longitude,
      eventStartAt: toISO(basic.eventStartAt),
      eventEndAt: toISO(basic.eventEndAt),
      registrationOpenAt: toISO(basic.registrationOpenAt),
      registrationCloseAt: toISO(basic.registrationCloseAt),
      routeProfile: [],
      mandatoryGear: basic.mandatoryGearText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      terms: basic.terms,
      refundPolicy:
        policy.policyType === "tiered"
          ? { ...policy, rules: policy.rules }
          : { ...policy, rules: [] },
      categories: categories.map((category) => ({
        name: category.name,
        distanceKm: category.distanceKm,
        elevationGainM: category.elevationGainM,
        difficulty: category.difficulty,
        price: category.price,
        quota: category.quota,
        minAge: category.minAge,
        cutoffMinutes: category.cutoffMinutes,
        requiresQualification: category.requiresQualification,
        bibPrefix: category.bibPrefix,
        bibStart: category.bibStart,
        bibEnd: category.bibEnd,
        requirements: category.requirementsText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line, index) => ({
            requirementType: "custom_text",
            label: line,
            description: "",
            isRequired: true,
            sortOrder: index + 1,
          })),
      })),
      formFields: fields
        .filter((field) => field.fieldKey.trim() && field.label.trim())
        .map((field, index) => ({
          fieldKey: field.fieldKey,
          label: field.label,
          fieldType: field.fieldType,
          options:
            field.fieldType === "select"
              ? field.optionsText.split(",").map((item) => item.trim()).filter(Boolean)
              : [],
          isRequired: field.isRequired,
          isSensitive: field.isSensitive,
          sortOrder: index + 1,
        })),
    }
  }

  async function handleSubmit(mode: "draft" | "review") {
    setError(null)
    setSaving(mode)
    try {
      const created = await createEvent.mutateAsync(buildPayload())
      if (mode === "review") {
        await submitEvent.mutateAsync(created.id)
        toast.success("Event dikirim untuk review")
      } else {
        toast.success("Draft event disimpan")
      }
      navigate(`/organizer/event-detail/${created.id}`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-6">
      <Heading>{t("organizer.newEvent")}</Heading>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informasi event</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="title">Judul event</Label>
            <Input id="title" value={basic.title} onChange={(e) => updateBasic("title", e.target.value)} required />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              value={basic.description}
              onChange={(e) => updateBasic("description", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="locationName">Nama lokasi</Label>
            <Input
              id="locationName"
              value={basic.locationName}
              onChange={(e) => updateBasic("locationName", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="province">Provinsi</Label>
            <Input
              id="province"
              value={basic.province}
              onChange={(e) => updateBasic("province", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">Kota</Label>
            <Input id="city" value={basic.city} onChange={(e) => updateBasic("city", e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="mandatoryGear">Mandatory gear (pisahkan koma)</Label>
            <Input
              id="mandatoryGear"
              value={basic.mandatoryGearText}
              onChange={(e) => updateBasic("mandatoryGearText", e.target.value)}
              placeholder="Jaket, Headlamp, Buff"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eventStartAt">Mulai event</Label>
            <Input
              id="eventStartAt"
              type="datetime-local"
              value={basic.eventStartAt}
              onChange={(e) => updateBasic("eventStartAt", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eventEndAt">Selesai event</Label>
            <Input
              id="eventEndAt"
              type="datetime-local"
              value={basic.eventEndAt}
              onChange={(e) => updateBasic("eventEndAt", e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="registrationOpenAt">Pendaftaran dibuka</Label>
            <Input
              id="registrationOpenAt"
              type="datetime-local"
              value={basic.registrationOpenAt}
              onChange={(e) => updateBasic("registrationOpenAt", e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="registrationCloseAt">Pendaftaran ditutup</Label>
            <Input
              id="registrationCloseAt"
              type="datetime-local"
              value={basic.registrationCloseAt}
              onChange={(e) => updateBasic("registrationCloseAt", e.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="terms">Syarat & ketentuan</Label>
            <Textarea id="terms" value={basic.terms} onChange={(e) => updateBasic("terms", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Kategori</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => setCategories((prev) => [...prev, newCategory()])}>
            <Plus className="mr-1 size-3.5" /> Tambah
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {categories.map((category, index) => (
            <div key={index} className="rounded-xl border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Kategori {index + 1}</p>
                {categories.length > 1 && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setCategories((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Nama</Label>
                  <Input value={category.name} onChange={(e) => updateCategory(index, { name: e.target.value })} required />
                </div>
                <div className="grid gap-2">
                  <Label>Jarak (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={category.distanceKm}
                    onChange={(e) => updateCategory(index, { distanceKm: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Elevasi (m)</Label>
                  <Input
                    type="number"
                    value={category.elevationGainM}
                    onChange={(e) => updateCategory(index, { elevationGainM: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={category.difficulty}
                    onValueChange={(value) =>
                      updateCategory(index, { difficulty: value as OrganizerCategoryInput["difficulty"] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="extreme">Extreme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Harga (IDR)</Label>
                  <Input
                    type="number"
                    value={category.price}
                    onChange={(e) => updateCategory(index, { price: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Kuota</Label>
                  <Input
                    type="number"
                    value={category.quota}
                    onChange={(e) => updateCategory(index, { quota: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Usia minimum</Label>
                  <Input
                    type="number"
                    value={category.minAge}
                    onChange={(e) => updateCategory(index, { minAge: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Cut-off (menit)</Label>
                  <Input
                    type="number"
                    value={category.cutoffMinutes}
                    onChange={(e) => updateCategory(index, { cutoffMinutes: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Prefix BIB</Label>
                  <Input
                    value={category.bibPrefix}
                    onChange={(e) => updateCategory(index, { bibPrefix: e.target.value })}
                    placeholder="EVT21"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>BIB mulai</Label>
                  <Input
                    type="number"
                    value={category.bibStart}
                    onChange={(e) => updateCategory(index, { bibStart: Number(e.target.value) })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>BIB akhir</Label>
                  <Input
                    type="number"
                    value={category.bibEnd}
                    onChange={(e) => updateCategory(index, { bibEnd: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id={`qual-${index}`}
                    type="checkbox"
                    checked={category.requiresQualification}
                    onChange={(e) => updateCategory(index, { requiresQualification: e.target.checked })}
                  />
                  <Label htmlFor={`qual-${index}`}>Butuh kualifikasi</Label>
                </div>
                <div className="grid gap-2 sm:col-span-3">
                  <Label>Syarat kualifikasi (satu per baris)</Label>
                  <Textarea
                    value={category.requirementsText}
                    onChange={(e) => updateCategory(index, { requirementsText: e.target.value })}
                    placeholder="Sertifikat finisher 21K&#10;Surat sehat"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Form peserta</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={() => setFields((prev) => [...prev, newField()])}>
            <Plus className="mr-1 size-3.5" /> Tambah
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={index} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Field key</Label>
                <Input
                  value={field.fieldKey}
                  onChange={(e) => updateField(index, { fieldKey: e.target.value })}
                  placeholder="jersey_size"
                />
              </div>
              <div className="grid gap-2">
                <Label>Label</Label>
                <Input value={field.label} onChange={(e) => updateField(index, { label: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Tipe</Label>
                <Select
                  value={field.fieldType}
                  onValueChange={(value) =>
                    updateField(index, { fieldType: value as OrganizerFormFieldInput["fieldType"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Select</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="textarea">Textarea</SelectItem>
                    <SelectItem value="checkbox">Checkbox</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {field.fieldType === "select" && (
                <div className="grid gap-2 sm:col-span-3">
                  <Label>Opsi (pisahkan koma)</Label>
                  <Input
                    value={field.optionsText}
                    onChange={(e) => updateField(index, { optionsText: e.target.value })}
                    placeholder="S, M, L, XL"
                  />
                </div>
              )}
              <div className="flex items-center gap-4 sm:col-span-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.isRequired}
                    onChange={(e) => updateField(index, { isRequired: e.target.checked })}
                  />
                  Wajib
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={field.isSensitive}
                    onChange={(e) => updateField(index, { isSensitive: e.target.checked })}
                  />
                  Sensitif
                </label>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="ml-auto text-destructive"
                    onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                  >
                    Hapus
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kebijakan refund</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label>Nama kebijakan</Label>
              <Input value={policy.name} onChange={(e) => setPolicy((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Tipe</Label>
              <Select
                value={policy.policyType}
                onValueChange={(value) =>
                  setPolicy((prev) => ({ ...prev, policyType: value as OrganizerRefundPolicyInput["policyType"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiered">Bertingkat</SelectItem>
                  <SelectItem value="no_refund">Tanpa refund</SelectItem>
                  <SelectItem value="full_refund">Refund penuh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-3">
              <Label>Deskripsi</Label>
              <Textarea
                value={policy.description}
                onChange={(e) => setPolicy((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          {policy.policyType === "tiered" && (
            <div className="space-y-3">
              {policy.rules.map((rule, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Minimal hari sebelum event</Label>
                    <Input
                      type="number"
                      value={rule.daysBeforeEventMin}
                      onChange={(e) =>
                        setPolicy((prev) => ({
                          ...prev,
                          rules: prev.rules.map((item, i) =>
                            i === index ? { ...item, daysBeforeEventMin: Number(e.target.value) } : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Maksimal hari (kosongkan = tak terbatas)</Label>
                    <Input
                      type="number"
                      value={rule.daysBeforeEventMax ?? ""}
                      onChange={(e) =>
                        setPolicy((prev) => ({
                          ...prev,
                          rules: prev.rules.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  daysBeforeEventMax: e.target.value === "" ? null : Number(e.target.value),
                                }
                              : item,
                          ),
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Persentase refund</Label>
                    <Input
                      type="number"
                      value={rule.refundPercent}
                      onChange={(e) =>
                        setPolicy((prev) => ({
                          ...prev,
                          rules: prev.rules.map((item, i) =>
                            i === index ? { ...item, refundPercent: Number(e.target.value) } : item,
                          ),
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setPolicy((prev) => ({
                    ...prev,
                    rules: [...prev.rules, { daysBeforeEventMin: 0, daysBeforeEventMax: null, refundPercent: 0 }],
                  }))
                }
              >
                <Plus className="mr-1 size-3.5" /> Tambah aturan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" disabled={saving !== null} onClick={() => void handleSubmit("draft")}>
          {saving === "draft" && <Loader2 className="mr-2 size-4 animate-spin" />}
          Simpan draft
        </Button>
        <Button type="button" disabled={saving !== null} onClick={() => void handleSubmit("review")}>
          {saving === "review" && <Loader2 className="mr-2 size-4 animate-spin" />}
          Simpan & kirim review
        </Button>
      </div>
    </div>
  )
}
