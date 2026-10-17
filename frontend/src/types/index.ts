/**
 * Tipe domain mengikuti `Event-Platform-ERD.md`.
 * Dipakai bersama oleh mock layer sekarang dan API Go nanti.
 */

export type EventType = "native" | "external"

export type EventStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "registration_closed"
  | "cancelled"
  | "completed"
  | "suspended"

export type RegistrationStatus =
  | "pending_verification"
  | "approved"
  | "awaiting_payment"
  | "paid"
  | "rejected"
  | "expired"
  | "waitlisted"
  | "cancelled"
  | "refunded"
  | "checked_in"

export type PaymentStatus =
  | "pending"
  | "paid"
  | "expired"
  | "failed"
  | "refunded"
  | "partially_refunded"

export type DisbursementStatus =
  | "pending"
  | "eligible"
  | "approved"
  | "paid"
  | "held"
  | "rejected"

export type VerificationStatus = "pending" | "verified" | "rejected"

export type Difficulty = "easy" | "moderate" | "hard" | "extreme"

export type QualificationRequirementType =
  | "finisher_certificate"
  | "race_result_link"
  | "profile_link"
  | "medical_certificate"
  | "custom_text"

export type FormFieldType =
  | "text"
  | "number"
  | "select"
  | "date"
  | "file"
  | "textarea"
  | "checkbox"

export type OrgRole = "owner" | "verifier" | "racepack_staff" | "finance"
export type AdminRole = "super_admin" | "support" | "finance"
export type AccountType = "attendee" | "organizer" | "admin"

export interface User {
  id: string
  email: string
  phone: string
  fullName: string
  birthDate: string
  gender: "male" | "female"
  emergencyContactName: string
  emergencyContactPhone: string
  status: "active" | "suspended"
  emailVerifiedAt: string | null
  createdAt: string
}

export interface UserDocument {
  id: string
  userId: string
  docType: QualificationRequirementType
  fileUrl?: string
  externalLink?: string
  label: string
  createdAt: string
}

export interface Organization {
  id: string
  name: string
  orgType: "community" | "event_organizer" | "foundation"
  officialEmail: string
  phone: string
  address: string
  province: string
  city: string
  legalDocUrl?: string
  verificationStatus: VerificationStatus
  verifiedBy?: string
  verifiedAt?: string
  rejectionReason?: string
  status: "active" | "suspended"
  createdAt: string
  /** turunan untuk UI */
  eventCount: number
  logoSeed: string
}

export interface OrganizerAccount {
  id: string
  organizationId: string
  email: string
  fullName: string
  phone: string
  positionTitle: string
  orgRole: OrgRole
  twoFactorEnabled: boolean
  status: "active" | "invited" | "disabled"
  invitedAt?: string
  createdAt: string
}

export interface OrganizationBankAccount {
  id: string
  organizationId: string
  bankName: string
  accountNumberMasked: string
  accountHolder: string
  verificationStatus: VerificationStatus
  isActive: boolean
}

export interface AdminUser {
  id: string
  email: string
  fullName: string
  adminRole: AdminRole
  twoFactorEnabled: boolean
  status: "active" | "suspended"
  createdAt: string
}

export interface EventCategory {
  id: string
  eventId: string
  name: string
  distanceKm: number
  elevationGainM: number
  difficulty: Difficulty
  price: number
  quota: number
  minAge: number
  cutoffMinutes: number
  requiresQualification: boolean
  bibPrefix: string
  bibNext: number
}

export interface QualificationRequirement {
  id: string
  categoryId: string
  requirementType: QualificationRequirementType
  label: string
  description: string
  isRequired: boolean
  sortOrder: number
}

export interface RegistrationFormField {
  id: string
  eventId: string
  fieldKey: string
  label: string
  fieldType: FormFieldType
  options?: string[]
  isRequired: boolean
  isSensitive: boolean
  sortOrder: number
}

export interface RefundPolicyRule {
  id: string
  policyId: string
  daysBeforeEventMin: number
  daysBeforeEventMax: number | null
  refundPercent: number
}

export interface RefundPolicy {
  id: string
  organizationId: string
  name: string
  policyType: "tiered" | "no_refund" | "full_refund"
  description: string
  version: number
  createdAt: string
  rules: RefundPolicyRule[]
}

export interface EventRoutePoint {
  km: number
  elevation: number
}

export interface Event {
  id: string
  organizationId: string | null
  reviewedBy?: string
  eventType: EventType
  title: string
  slug: string
  description: string
  locationName: string
  province: string
  city: string
  latitude: number
  longitude: number
  eventStartAt: string
  eventEndAt: string
  registrationOpenAt: string | null
  registrationCloseAt: string | null
  status: EventStatus
  externalUrl?: string
  coverUrl: string
  routeGpxUrl?: string
  mandatoryGear: string[]
  terms: string
  isFeatured: boolean
  refundPolicyId?: string
  publishedAt?: string
  createdAt: string
  /** turunan / relasi */
  categories: EventCategory[]
  requirements: QualificationRequirement[]
  formFields: RegistrationFormField[]
  refundPolicy?: RefundPolicy
  routeProfile: EventRoutePoint[]
  organizerName: string
  organizerVerified: boolean
  participantCount: number
  /** jumlah slot terisi per category_id (dihitung dari registrations) */
  categoryCounts?: Record<string, number>
  /** untuk event eksternal */
  sourceUpdatedAt?: string
}

export interface Registration {
  id: string
  userId: string
  eventId: string
  categoryId: string
  status: RegistrationStatus
  fullNameSnapshot: string
  birthDateSnapshot: string
  waitlistPosition?: number
  reviewedBy?: string
  submittedAt: string
  reviewedAt?: string
  rejectionReason?: string
  paymentDeadlineAt?: string
  approvedAt?: string
  paidAt?: string
  dataLockedAt?: string
  bibNumber?: string
  refundPolicyId?: string
  refundPolicyVersion?: number
  createdAt: string
  /** relasi untuk UI */
  event?: Event
  category?: EventCategory
  payment?: Payment
  ticket?: Ticket
  answers: RegistrationAnswer[]
  qualificationSubmissions: QualificationSubmission[]
  statusLogs: RegistrationStatusLog[]
}

export interface QualificationSubmission {
  id: string
  registrationId: string
  requirementId: string
  requirementLabel: string
  valueText?: string
  fileUrl?: string
  externalLink?: string
  status: "submitted" | "accepted" | "rejected"
  reviewerNote?: string
  createdAt: string
}

export interface RegistrationAnswer {
  id: string
  registrationId: string
  fieldId: string
  fieldLabel: string
  value: string
  isEncrypted: boolean
}

export interface RegistrationStatusLog {
  id: string
  registrationId: string
  fromStatus: RegistrationStatus | null
  toStatus: RegistrationStatus
  actorType: "user" | "organizer" | "admin" | "system"
  actorName: string
  note?: string
  createdAt: string
}

export interface Payment {
  id: string
  registrationId: string
  orderId: string
  gateway: string
  gatewayRef?: string
  method: "va" | "ewallet" | "qris" | "card"
  amount: number
  platformFee: number
  gatewayFee: number
  status: PaymentStatus
  expiresAt: string
  paidAt?: string
  createdAt: string
}

export interface Refund {
  id: string
  paymentId: string
  registrationId: string
  amount: number
  reasonType:
    | "event_cancelled"
    | "participant_cancel"
    | "payment_error"
    | "overbooked"
    | "other"
  status: "requested" | "processing" | "refunded" | "refund_failed"
  gatewayRef?: string
  feeBorneBy: "platform" | "organizer" | "participant"
  processedBy?: string
  requestedAt: string
  processedAt?: string
}

export interface Ticket {
  id: string
  registrationId: string
  qrCode: string
  status: "issued" | "used" | "revoked"
  issuedAt: string
}

export interface RacepackCheckin {
  id: string
  ticketId: string
  checkedInBy: string
  checkedInByName: string
  pickupType: "self" | "representative"
  representativeName?: string
  representativeNote?: string
  createdOffline: boolean
  scannedAt: string
  syncedAt?: string
}

export interface DisbursementCondition {
  id: string
  disbursementId: string
  conditionKey: string
  description: string
  isMet: boolean
  checkedBy?: string
  checkedAt?: string
}

export interface Disbursement {
  id: string
  eventId: string
  organizationId: string
  bankAccountId: string
  stage: 1 | 2 | 3
  percentage: number
  amount: number
  status: DisbursementStatus
  approvedBy?: string
  requestedAt?: string
  approvedAt?: string
  paidAt?: string
  payoutRef?: string
  note?: string
  conditions: DisbursementCondition[]
  event?: Event
}

export interface Dispute {
  id: string
  eventId: string
  registrationId?: string
  reporterType: "user" | "organizer" | "admin"
  reporterName: string
  disputeType:
    | "payment"
    | "rejection"
    | "event_cancelled"
    | "refund"
    | "organizer_fraud"
    | "other"
  description: string
  status: "open" | "in_review" | "resolved" | "rejected"
  handledBy?: string
  resolution?: string
  createdAt: string
  resolvedAt?: string
  eventTitle: string
}

export interface Broadcast {
  id: string
  eventId: string
  sentBy: string
  channel: "email" | "whatsapp" | "in_app"
  subject: string
  message: string
  recipients: number
  sentAt: string
}

export interface Notification {
  id: string
  recipientType: AccountType | "system"
  recipientId: string
  channel: "email" | "whatsapp" | "in_app"
  templateKey: string
  title: string
  body: string
  payload?: Record<string, unknown>
  status: "sent" | "queued" | "failed"
  readAt?: string
  sentAt?: string
  createdAt: string
}

export interface AuditLog {
  id: string
  actorType: "user" | "organizer" | "admin" | "system"
  actorName: string
  action: string
  entityType: string
  entityId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ipAddress: string
  createdAt: string
}

export interface OrganizerStats {
  registrationsByCategory: { category: string; terisi: number; kuota: number }[]
  registrationTrend: { date: string; pendaftar: number; lunas: number }[]
  jerseyRecap: { size: string; count: number }[]
  money: {
    collected: number
    disbursed: number
    held: number
    estimated: number
  }
}

export interface AdminStats {
  totalEvents: number
  nativeEvents: number
  externalEvents: number
  totalRegistrations: number
  gmv: number
  platformRevenue: number
  pendingOrganizations: number
  pendingEvents: number
  openDisputes: number
  growth: { month: string; users: number; registrations: number; gmv: number }[]
  eventMix: { name: string; value: number; color: string }[]
}
