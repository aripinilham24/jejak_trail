import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
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
import { ROLE_HOME } from "@/components/layout/nav-config"
import { errorMessage, useAuth } from "@/lib/auth/auth-context"
import type { AccountType } from "@/types"

const ACCOUNT_TYPES: AccountType[] = ["attendee", "organizer", "admin"]

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signIn } = useAuth()

  const initialType = ACCOUNT_TYPES.includes(searchParams.get("as") as AccountType)
    ? (searchParams.get("as") as AccountType)
    : "attendee"

  const [accountType, setAccountType] = useState<AccountType>(initialType)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const identity = await signIn({ email, password, accountType })
      const from = searchParams.get("from")
      navigate(from || ROLE_HOME[identity.accountType], { replace: true })
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
            <CardTitle className="text-2xl">{t("auth.login.title")}</CardTitle>
            <CardDescription>{t("auth.login.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="accountType">Masuk sebagai</Label>
                <Select value={accountType} onValueChange={(value) => setAccountType(value as AccountType)}>
                  <SelectTrigger id="accountType" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="attendee">Peserta</SelectItem>
                    <SelectItem value="organizer">Organizer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">{t("auth.login.emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">{t("auth.login.passwordLabel")}</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
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
                {loading ? "Memproses..." : t("auth.login.signInButton")}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              {t("auth.login.noAccount")}{" "}
              <Link to="/register-attendee" className="underline">
                {t("auth.login.signUpAttendee")}
              </Link>{" "}
              {t("auth.login.or")}{" "}
              <Link to="/register-organizer" className="underline">
                {t("auth.login.signUpOrganizer")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  )
}
