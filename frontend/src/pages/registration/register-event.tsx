import { useEffect, useState } from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Stepper } from "@/components/shared/stepper"
import { PublicLayout } from "@/components/layout/public-layout"
import { useEvent, useSubmitRegistration, useUploadFile } from "@/lib/api/hooks"
import { errorMessage, useAuth } from "@/lib/auth/auth-context"
import { useIdentity } from "@/lib/session"
import { formatDateTime, formatIDR } from "@/lib/format"
import type { RegistrationFormField } from "@/types"

interface QualificationState {
  valueText: string
  fileKey: string
  fileName: string
  externalLink: string
}

export function RegisterEventPage() {
  const { id: slug } = useParams()
  const navigate = useNavigate()
  const auth = useAuth()
  const identity = useIdentity()
  const eventQuery = useEvent(slug)
  const submit = useSubmitRegistration(slug ?? "")
  const upload = useUploadFile()

  const [step, setStep] = useState(1)
  const [categoryId, setCategoryId] = useState("")
  const [fullName, setFullName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [qualifications, setQualifications] = useState<Record<string, QualificationState>>({})
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const event = eventQuery.data
  const category = event?.categories.find((item) => item.id === categoryId)
  const requirements = event?.requirements.filter((item) => item.categoryId === categoryId) ?? []
  const formFields = event?.formFields ?? []

  useEffect(() => {
    if (auth.status !== "authenticated") return
    setFullName((prev) => prev || identity.user.fullName || "")
    setBirthDate((prev) => prev || identity.user.birthDate || "")
  }, [auth.status, identity.user.fullName, identity.user.birthDate])

  if (auth.status === "loading" || eventQuery.isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-amber-500" />
      </div>
    )
  }

  if (auth.status !== "authenticated") {
    const from = encodeURIComponent(`/registration/${slug ?? ""}`)
    return <Navigate to={`/login?as=attendee&from=${from}`} replace />
  }

  if (!event) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-2xl font-semibold">Event tidak ditemukan</h1>
          <Button asChild className="mt-4">
            <Link to="/events">Kembali ke daftar event</Link>
          </Button>
        </div>
      </PublicLayout>
    )
  }

  function setQualification(id: string, patch: Partial<QualificationState>) {
    setQualifications((prev) => {
      const current = prev[id] ?? { valueText: "", fileKey: "", fileName: "", externalLink: "" }
      return { ...prev, [id]: { ...current, ...patch } }
    })
  }

  async function handleUpload(requirementId: string, file: File | null) {
    if (!file) return
    try {
      const result = await upload.mutateAsync({ file, purpose: "qualification" })
      setQualification(requirementId, { fileKey: result.key, fileName: file.name })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleFormFieldUpload(field: RegistrationFormField, file: File | null) {
    if (!file) return
    try {
      const result = await upload.mutateAsync({ file, purpose: "document" })
      setAnswers((prev) => ({ ...prev, [field.id]: result.key }))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleSubmit() {
    if (!category) {
      setError("Pilih kategori terlebih dahulu.")
      setStep(1)
      return
    }
    if (!agree) {
      setError("Anda harus menyetujui syarat dan ketentuan.")
      return
    }

    setError(null)
    try {
      const result = await submit.mutateAsync({
        categoryId: category.id,
        fullName,
        birthDate: birthDate || undefined,
        answers: Object.entries(answers)
          .filter(([, value]) => value !== "")
          .map(([fieldId, value]) => ({ fieldId, value })),
        qualifications: Object.entries(qualifications)
          .filter(([, value]) => value.valueText || value.fileKey || value.externalLink)
          .map(([requirementId, value]) => ({
            requirementId,
            valueText: value.valueText || undefined,
            fileKey: value.fileKey || undefined,
            externalLink: value.externalLink || undefined,
          })),
      })
      navigate(`/account/registrations/${result.id}`)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function renderField(field: RegistrationFormField) {
    const value = answers[field.id] ?? ""
    const setValue = (next: string) => setAnswers((prev) => ({ ...prev, [field.id]: next }))

    switch (field.fieldType) {
      case "textarea":
        return <Textarea value={value} onChange={(e) => setValue(e.target.value)} />
      case "select":
        return (
          <select
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          >
            <option value="">Pilih…</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )
      case "checkbox":
        return (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value === "true"}
              onChange={(e) => setValue(e.target.checked ? "true" : "false")}
            />
            {field.label}
          </label>
        )
      case "file":
        return (
          <Input
            type="file"
            onChange={(e) => void handleFormFieldUpload(field, e.target.files?.[0] ?? null)}
          />
        )
      default:
        return (
          <Input
            type={field.fieldType === "number" ? "number" : field.fieldType === "date" ? "date" : "text"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )
    }
  }

  return (
    <PublicLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Button variant="ghost" className="-ml-3 mb-4" onClick={() => navigate(-1)}>
          <ChevronLeft className="mr-2 size-4" />
          Kembali
        </Button>

        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          Pendaftaran {event.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatDateTime(event.eventStartAt)} · {event.city}, {event.province}
        </p>

        <div className="mt-6">
          <Stepper
            currentStep={step}
            steps={[
              { label: "Kategori", description: "Pilih jarak" },
              { label: "Data peserta", description: "Form & kualifikasi" },
              { label: "Konfirmasi", description: "Periksa dan kirim" },
            ]}
          />
        </div>

        <div className="mt-6 space-y-4">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pilih kategori</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {event.categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategoryId(item.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      categoryId === item.id
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-border hover:border-amber-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.distanceKm} km · {item.elevationGainM} m gain · cut-off {item.cutoffMinutes} menit
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatIDR(item.price)}</p>
                        <p className="text-xs text-muted-foreground">kuota {item.quota}</p>
                      </div>
                    </div>
                    {item.requiresQualification && (
                      <Badge variant="outline" className="mt-2 border-violet-400/40 text-violet-600 dark:text-violet-300">
                        Perlu kualifikasi
                      </Badge>
                    )}
                  </button>
                ))}
              </CardContent>
              <CardFooter className="justify-end">
                <Button disabled={!categoryId} onClick={() => setStep(2)}>
                  Lanjut <ChevronRight className="ml-2 size-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data peserta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Nama lengkap</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="birthDate">Tanggal lahir</Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                </div>

                {formFields.map((field) => (
                  <div key={field.id} className="grid gap-2">
                    <Label>
                      {field.label} {field.isRequired && <span className="text-destructive">*</span>}
                    </Label>
                    {renderField(field)}
                    {field.isSensitive && (
                      <p className="text-[11px] text-muted-foreground">
                        Data ini disimpan terenkripsi dan hanya diakses organizer berwenang.
                      </p>
                    )}
                  </div>
                ))}

                {requirements.length > 0 && (
                  <div className="space-y-4">
                    <Separator />
                    <p className="text-sm font-medium">Kualifikasi</p>
                    {requirements.map((requirement) => {
                      const state = qualifications[requirement.id]
                      const isLink = requirement.requirementType === "race_result_link" || requirement.requirementType === "profile_link"
                      return (
                        <div key={requirement.id} className="rounded-xl border border-border p-4">
                          <p className="text-sm font-medium">
                            {requirement.label} {requirement.isRequired && <span className="text-destructive">*</span>}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{requirement.description}</p>
                          <div className="mt-3 space-y-2">
                            {isLink ? (
                              <Input
                                placeholder="https://…"
                                value={state?.externalLink ?? ""}
                                onChange={(e) => setQualification(requirement.id, { externalLink: e.target.value })}
                              />
                            ) : (
                              <>
                                <Input
                                  placeholder="Keterangan / nomor sertifikat"
                                  value={state?.valueText ?? ""}
                                  onChange={(e) => setQualification(requirement.id, { valueText: e.target.value })}
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent">
                                    <Upload className="size-3.5" />
                                    Unggah file (PDF/JPG/PNG)
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                                      onChange={(e) => void handleUpload(requirement.id, e.target.files?.[0] ?? null)}
                                    />
                                  </label>
                                  {state?.fileName && (
                                    <span className="text-xs text-emerald-600 dark:text-emerald-300">
                                      {state.fileName}
                                    </span>
                                  )}
                                  {upload.isPending && <Loader2 className="size-3.5 animate-spin" />}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ChevronLeft className="mr-2 size-4" /> Kembali
                </Button>
                <Button onClick={() => setStep(3)}>
                  Lanjut <ChevronRight className="ml-2 size-4" />
                </Button>
              </CardFooter>
            </Card>
          )}

          {step === 3 && category && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Konfirmasi pendaftaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Event</span>
                    <span className="font-medium">{event.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kategori</span>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Peserta</span>
                    <span className="font-medium">{fullName}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatIDR(category.price)}</span>
                  </div>
                </div>

                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Data tidak dapat diubah setelah pembayaran lunas. Untuk event berkualifikasi,
                  pendaftaran akan ditinjau organizer sebelum pembayaran.
                </p>

                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    className="mt-0.5"
                  />
                  Saya menyetujui syarat dan ketentuan event serta kebijakan refund yang berlaku.
                </label>
              </CardContent>
              <CardFooter className="justify-between">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ChevronLeft className="mr-2 size-4" /> Kembali
                </Button>
                <Button disabled={submit.isPending} onClick={() => void handleSubmit()}>
                  {submit.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                  Kirim pendaftaran
                </Button>
              </CardFooter>
            </Card>
          )}

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      </div>
    </PublicLayout>
  )
}
