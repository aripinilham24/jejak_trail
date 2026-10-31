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
import { PublicLayout } from "@/components/layout/public-layout"
import { errorMessage, useAuth } from "@/lib/auth/auth-context"

export function RegisterAttendeePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { registerAttendee } = useAuth()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await registerAttendee({
        fullName,
        email,
        password,
        phone: phone || undefined,
      })
      navigate("/account", { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-col items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-2xl">{t("auth.registerAttendee.title")}</CardTitle>
            <CardDescription>{t("auth.registerAttendee.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="name">{t("auth.registerAttendee.nameLabel")}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t("auth.registerAttendee.emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Nomor HP (opsional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0812..."
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t("auth.registerAttendee.passwordLabel")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memproses..." : t("auth.registerAttendee.createAccountButton")}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              {t("auth.registerAttendee.haveAccount")}{" "}
              <Link to="/login" className="underline">
                {t("auth.registerAttendee.signIn")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  )
}
