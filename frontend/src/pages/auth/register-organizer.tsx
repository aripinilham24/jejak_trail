import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PublicLayout } from "@/components/layout/public-layout"
import { errorMessage, useAuth } from "@/lib/auth/auth-context"

export function RegisterOrganizerPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { registerOrganizer } = useAuth()

  const [form, setForm] = useState({
    organizationName: "",
    orgType: "community" as "community" | "event_organizer" | "foundation",
    organizationEmail: "",
    organizationPhone: "",
    address: "",
    province: "",
    city: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    fullName: "",
    email: "",
    password: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await registerOrganizer({
        organization: {
          name: form.organizationName,
          orgType: form.orgType,
          officialEmail: form.organizationEmail || form.email,
          phone: form.organizationPhone,
          address: form.address,
          province: form.province,
          city: form.city,
        },
        owner: {
          email: form.email,
          password: form.password,
          fullName: form.fullName,
        },
        bank: {
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          accountHolder: form.accountHolder,
        },
      })
      navigate("/organizer/onboarding", { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center py-10">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">{t("auth.registerOrganizer.title")}</CardTitle>
            <CardDescription>{t("auth.registerOrganizer.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="organizationName">
                    {t("auth.registerOrganizer.organizationNameLabel")}
                  </Label>
                  <Input
                    id="organizationName"
                    placeholder="PT. Maju Mundur"
                    value={form.organizationName}
                    onChange={(event) => update("organizationName", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="orgType">Jenis organisasi</Label>
                  <Select
                    value={form.orgType}
                    onValueChange={(value) => update("orgType", value as typeof form.orgType)}
                  >
                    <SelectTrigger id="orgType" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="community">Komunitas</SelectItem>
                      <SelectItem value="event_organizer">Event Organizer</SelectItem>
                      <SelectItem value="foundation">Yayasan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="organizationEmail">Email resmi organisasi</Label>
                  <Input
                    id="organizationEmail"
                    type="email"
                    placeholder="hello@organisasi.id"
                    value={form.organizationEmail}
                    onChange={(event) => update("organizationEmail", event.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="organizationPhone">Telepon organisasi</Label>
                  <Input
                    id="organizationPhone"
                    value={form.organizationPhone}
                    onChange={(event) => update("organizationPhone", event.target.value)}
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
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="address">Alamat</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(event) => update("address", event.target.value)}
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
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="bankName">Nama bank</Label>
                  <Input
                    id="bankName"
                    placeholder="BCA"
                    value={form.bankName}
                    onChange={(event) => update("bankName", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="accountNumber">Nomor rekening</Label>
                  <Input
                    id="accountNumber"
                    inputMode="numeric"
                    value={form.accountNumber}
                    onChange={(event) => update("accountNumber", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="accountHolder">Nama pemilik rekening</Label>
                  <Input
                    id="accountHolder"
                    value={form.accountHolder}
                    onChange={(event) => update("accountHolder", event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t("auth.registerOrganizer.nameLabel")}</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={(event) => update("fullName", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("auth.registerOrganizer.emailLabel")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="password">{t("auth.registerOrganizer.passwordLabel")}</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={form.password}
                    onChange={(event) => update("password", event.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memproses..." : t("auth.registerOrganizer.createAccountButton")}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              {t("auth.registerOrganizer.haveAccount")}{" "}
              <Link to="/login" className="underline">
                {t("auth.registerOrganizer.signIn")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  )
}
