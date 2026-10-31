import type { AccountType, AdminUser, Organization, OrganizerAccount, User } from "@/types"

export interface ApiIdentity {
  accountType: AccountType
  user?: User
  organizer?: OrganizerAccount
  organization?: Organization
  admin?: AdminUser
}

export interface AuthResponse {
  accessToken: string
  expiresIn: number
  identity: ApiIdentity
}

export interface LoginPayload {
  email: string
  password: string
  accountType: AccountType
}

export interface AttendeeRegisterPayload {
  email: string
  password: string
  fullName: string
  phone?: string
  birthDate?: string
  gender?: "male" | "female"
  emergencyContactName?: string
  emergencyContactPhone?: string
}

export interface OrganizerRegisterPayload {
  organization: {
    name: string
    orgType: "community" | "event_organizer" | "foundation"
    officialEmail: string
    phone: string
    address: string
    province: string
    city: string
  }
  owner: {
    email: string
    password: string
    fullName: string
    phone?: string
    positionTitle?: string
  }
  bank: {
    bankName: string
    accountNumber: string
    accountHolder: string
  }
}
