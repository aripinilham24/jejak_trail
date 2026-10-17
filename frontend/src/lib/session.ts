import { useSyncExternalStore } from "react"
import type { AccountType, AdminUser, OrganizerAccount, Organization, User } from "@/types"
import { useDb } from "./mock/store"

export const CURRENT_USER_ID = "usr-001"
export const CURRENT_ORGANIZATION_ID = "org-001"
export const CURRENT_ADMIN_ID = "adm-001"

interface SessionState {
  accountType: AccountType
  isAuthenticated: boolean
}

const STORAGE_KEY = "jejak-trail-session"

function readInitial(): SessionState {
  if (typeof window === "undefined") {
    return { accountType: "attendee", isAuthenticated: true }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SessionState>
      if (parsed.accountType && typeof parsed.isAuthenticated === "boolean") {
        return { accountType: parsed.accountType, isAuthenticated: parsed.isAuthenticated }
      }
    }
  } catch {
    /* ignore */
  }
  return { accountType: "attendee", isAuthenticated: true }
}

let state: SessionState = readInitial()
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

export function useSession() {
  const session = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return {
    ...session,
    signIn(accountType: AccountType) {
      state = { accountType, isAuthenticated: true }
      emit()
    },
    signOut() {
      state = { ...state, isAuthenticated: false }
      emit()
    },
    switchAccountType(accountType: AccountType) {
      state = { accountType, isAuthenticated: true }
      emit()
    },
  }
}

export interface CurrentIdentity {
  user: User
  organizer: OrganizerAccount
  organization: Organization
  admin: AdminUser
}

export function useIdentity(): CurrentIdentity {
  const db = useDb()
  return {
    user: db.users.find((u) => u.id === CURRENT_USER_ID)!,
    organizer: db.organizerAccounts.find((o) => o.id === `oa-${CURRENT_ORGANIZATION_ID}-owner`)!,
    organization: db.organizations.find((o) => o.id === CURRENT_ORGANIZATION_ID)!,
    admin: db.adminUsers.find((a) => a.id === CURRENT_ADMIN_ID)!,
  }
}
