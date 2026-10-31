import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { api, ApiError, setAccessToken } from "@/lib/api/client"
import type {
  ApiIdentity,
  AttendeeRegisterPayload,
  AuthResponse,
  LoginPayload,
  OrganizerRegisterPayload,
} from "@/lib/api/types"
import type { AccountType } from "@/types"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

interface AuthContextValue {
  status: AuthStatus
  identity: ApiIdentity | null
  accountType: AccountType | null
  signIn: (payload: LoginPayload) => Promise<ApiIdentity>
  registerAttendee: (payload: AttendeeRegisterPayload) => Promise<ApiIdentity>
  registerOrganizer: (payload: OrganizerRegisterPayload) => Promise<ApiIdentity>
  signOut: () => Promise<void>
  refresh: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading")
  const [identity, setIdentity] = useState<ApiIdentity | null>(null)

  const applyAuth = useCallback((payload: AuthResponse) => {
    setAccessToken(payload.accessToken)
    setIdentity(payload.identity)
    setStatus("authenticated")
    return payload.identity
  }, [])

  const refresh = useCallback(async () => {
    try {
      const payload = await api.post<AuthResponse>("/auth/refresh", {})
      applyAuth(payload)
      return true
    } catch {
      setAccessToken(null)
      setIdentity(null)
      setStatus("unauthenticated")
      return false
    }
  }, [applyAuth])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signIn = useCallback(
    async (payload: LoginPayload) => {
      const result = await api.post<AuthResponse>("/auth/login", payload)
      return applyAuth(result)
    },
    [applyAuth],
  )

  const registerAttendee = useCallback(
    async (payload: AttendeeRegisterPayload) => {
      const result = await api.post<AuthResponse>("/auth/attendee/register", payload)
      return applyAuth(result)
    },
    [applyAuth],
  )

  const registerOrganizer = useCallback(
    async (payload: OrganizerRegisterPayload) => {
      const result = await api.post<AuthResponse>("/auth/organizer/register", payload)
      return applyAuth(result)
    },
    [applyAuth],
  )

  const signOut = useCallback(async () => {
    try {
      await api.post("/auth/logout", {})
    } catch {
      // Sesi lokal tetap dibersihkan walau request gagal.
    } finally {
      setAccessToken(null)
      setIdentity(null)
      setStatus("unauthenticated")
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      identity,
      accountType: identity?.accountType ?? null,
      signIn,
      registerAttendee,
      registerOrganizer,
      signOut,
      refresh,
    }),
    [status, identity, signIn, registerAttendee, registerOrganizer, signOut, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth harus dipakai di dalam AuthProvider")
  }
  return context
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.fields && Object.keys(error.fields).length > 0) {
      return Object.values(error.fields)[0] ?? error.message
    }
    return error.message
  }
  if (error instanceof Error) return error.message
  return "Terjadi kesalahan. Coba lagi."
}
