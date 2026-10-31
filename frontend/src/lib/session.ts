import { useAuth } from "@/lib/auth/auth-context"
import {
  mockAdminUsers,
  mockOrganizerAccounts,
  mockOrganizations,
  mockUsers,
} from "@/lib/mock/data"
import type { AccountType, AdminUser, OrganizerAccount, Organization, User } from "@/types"

export interface CurrentIdentity {
  user: User
  organizer: OrganizerAccount
  organization: Organization
  admin: AdminUser
}

/** Kompatibilitas untuk halaman yang belum dimigrasi dari mock. */
const fallbackIdentity: CurrentIdentity = {
  user: mockUsers[0],
  organizer: mockOrganizerAccounts[0],
  organization: mockOrganizations[0],
  admin: mockAdminUsers[0],
}

export function useSession() {
  const auth = useAuth()
  return {
    accountType: (auth.accountType ?? "attendee") as AccountType,
    isAuthenticated: auth.status === "authenticated",
    isLoading: auth.status === "loading",
    signOut: auth.signOut,
  }
}

export function useIdentity(): CurrentIdentity {
  const { identity } = useAuth()
  if (!identity) return fallbackIdentity

  return {
    user: identity.user ?? fallbackIdentity.user,
    organizer: identity.organizer ?? fallbackIdentity.organizer,
    organization: identity.organization ?? fallbackIdentity.organization,
    admin: identity.admin ?? fallbackIdentity.admin,
  }
}
