import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, toQuery } from "@/lib/api/client"
import type { Event, Organization, Registration } from "@/types"

export interface EventQuery {
  q?: string
  province?: string
  city?: string
  type?: "native" | "external"
  month?: string
  difficulty?: string
  registrationStatus?: "open" | "closed"
  sort?: "event_date" | "newest" | "title"
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}

export interface DiscoveryMeta {
  provinces: string[]
  cities: { province: string; city: string }[]
  difficulties: string[]
}

export interface BankAccount {
  id: string
  organizationId: string
  bankName: string
  accountNumberMasked: string
  accountHolder: string
  verificationStatus: "pending" | "verified" | "rejected"
  isActive: boolean
}

export interface OrganizationAdmin extends Organization {
  bankAccounts: BankAccount[]
}

export interface ExternalEventInput {
  title: string
  description: string
  locationName: string
  province: string
  city: string
  latitude: number
  longitude: number
  eventStartAt: string
  eventEndAt: string
  externalUrl: string
  coverKey?: string
  isFeatured?: boolean
  terms?: string
}

export function useEvents(params: EventQuery = {}) {
  return useQuery({
    queryKey: ["events", params],
    queryFn: () => api.list<Event>(`/events${toQuery(params)}`),
  })
}

export function useEvent(slug: string | undefined) {
  return useQuery({
    queryKey: ["event", slug],
    queryFn: () => api.get<Event>(`/events/${slug}`),
    enabled: Boolean(slug),
  })
}

export function useDiscoveryMeta() {
  return useQuery({
    queryKey: ["discovery-meta"],
    queryFn: () => api.get<DiscoveryMeta>("/meta/discovery-filters"),
    staleTime: 5 * 60_000,
  })
}

export function useAdminEvents(
  params: { status?: string; type?: string; q?: string; page?: number; limit?: number; enabled?: boolean } = {},
) {
  const { enabled = true, ...query } = params
  return useQuery({
    queryKey: ["admin-events", query],
    queryFn: () => api.list<Event>(`/admin/events${toQuery(query)}`),
    enabled,
  })
}

export function useAdminOrganizations(
  params: { status?: string; q?: string; page?: number; limit?: number; enabled?: boolean } = {},
) {
  const { enabled = true, ...query } = params
  return useQuery({
    queryKey: ["admin-organizations", query],
    queryFn: () => api.list<OrganizationAdmin>(`/admin/organizations${toQuery(query)}`),
    enabled,
  })
}

export function useCreateExternalEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ExternalEventInput) => api.post<Event>("/admin/external-events", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] })
      void queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })
}

export function useUpdateExternalEvent(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ExternalEventInput) => api.patch<Event>(`/admin/external-events/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] })
      void queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })
}

export function useDeleteExternalEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/admin/external-events/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] })
      void queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })
}

export function useReviewEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      api.post<Event>(`/admin/events/${id}/review`, { approve, note }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-events"] })
      void queryClient.invalidateQueries({ queryKey: ["events"] })
    },
  })
}

export function useVerifyOrganization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) =>
      api.post<OrganizationAdmin>(`/admin/organizations/${id}/verify`, { approve, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-organizations"] })
    },
  })
}

export interface OrganizerRequirementInput {
  requirementType: string
  label: string
  description?: string
  isRequired: boolean
  sortOrder: number
}

export interface OrganizerCategoryInput {
  name: string
  distanceKm: number
  elevationGainM: number
  difficulty: "easy" | "moderate" | "hard" | "extreme"
  price: number
  quota: number
  minAge: number
  cutoffMinutes: number
  requiresQualification: boolean
  bibPrefix: string
  bibStart: number
  bibEnd: number
  requirements: OrganizerRequirementInput[]
}

export interface OrganizerFormFieldInput {
  fieldKey: string
  label: string
  fieldType: "text" | "number" | "select" | "date" | "file" | "textarea" | "checkbox"
  options: string[]
  isRequired: boolean
  isSensitive: boolean
  sortOrder: number
}

export interface OrganizerRefundRuleInput {
  daysBeforeEventMin: number
  daysBeforeEventMax: number | null
  refundPercent: number
}

export interface OrganizerRefundPolicyInput {
  name: string
  policyType: "tiered" | "no_refund" | "full_refund"
  description: string
  rules: OrganizerRefundRuleInput[]
}

export interface OrganizerEventInput {
  title: string
  description: string
  locationName: string
  province: string
  city: string
  latitude: number
  longitude: number
  eventStartAt: string
  eventEndAt: string
  registrationOpenAt: string
  registrationCloseAt: string
  coverKey?: string | null
  routeGpxKey?: string | null
  routeProfile: { km: number; elevation: number }[]
  mandatoryGear: string[]
  terms: string
  refundPolicy: OrganizerRefundPolicyInput | null
  categories: OrganizerCategoryInput[]
  formFields: OrganizerFormFieldInput[]
}

export function useOrganizerEvents(params: { status?: string; q?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["organizer-events", params],
    queryFn: () => api.list<Event>(`/organizer/events${toQuery(params)}`),
  })
}

export function useOrganizerEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["organizer-event", id],
    queryFn: () => api.get<Event>(`/organizer/events/${id}`),
    enabled: Boolean(id),
  })
}

export function useCreateOrganizerEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OrganizerEventInput) => api.post<Event>("/organizer/events", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer-events"] })
    },
  })
}

export function useUpdateOrganizerEvent(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OrganizerEventInput) => api.put<Event>(`/organizer/events/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer-events"] })
      void queryClient.invalidateQueries({ queryKey: ["organizer-event", id] })
    },
  })
}

export function useSubmitOrganizerEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Event>(`/organizer/events/${id}/submit`, {}),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ["organizer-events"] })
      void queryClient.invalidateQueries({ queryKey: ["organizer-event", id] })
    },
  })
}

export function useMyRegistrations() {
  return useQuery({
    queryKey: ["my-registrations"],
    queryFn: () => api.list<Registration>("/account/registrations"),
  })
}

export function useMyRegistration(id: string | undefined) {
  return useQuery({
    queryKey: ["my-registration", id],
    queryFn: () => api.get<Registration>(`/account/registrations/${id}`),
    enabled: Boolean(id),
  })
}

export function useSubmitRegistration(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      categoryId: string
      fullName: string
      birthDate?: string
      answers: { fieldId: string; value: string }[]
      qualifications: { requirementId: string; valueText?: string; fileKey?: string; externalLink?: string }[]
    }) => api.post<Registration>(`/events/${slug}/registrations`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-registrations"] })
      void queryClient.invalidateQueries({ queryKey: ["event", slug] })
    },
  })
}

export function useOrganizerRegistrations(
  params: { eventId?: string; status?: string; q?: string; page?: number; limit?: number; enabled?: boolean } = {},
) {
  const { enabled = true, ...query } = params
  return useQuery({
    queryKey: ["organizer-registrations", query],
    queryFn: () => api.list<Registration>(`/organizer/registrations${toQuery(query)}`),
    enabled,
  })
}

export function useOrganizerRegistration(id: string | undefined) {
  return useQuery({
    queryKey: ["organizer-registration", id],
    queryFn: () => api.get<Registration>(`/organizer/registrations/${id}`),
    enabled: Boolean(id),
  })
}

export function useApproveRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<Registration>(`/organizer/registrations/${id}/approve`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer-registrations"] })
      void queryClient.invalidateQueries({ queryKey: ["organizer-registration"] })
    },
  })
}

export function useRejectRegistration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post<Registration>(`/organizer/registrations/${id}/reject`, { reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["organizer-registrations"] })
      void queryClient.invalidateQueries({ queryKey: ["organizer-registration"] })
    },
  })
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async ({ file, purpose }: { file: File; purpose: string }) => {
      const form = new FormData()
      form.append("file", file)
      form.append("purpose", purpose)
      return api.post<{ key: string; url: string }>("/uploads", form)
    },
  })
}

export interface TicketDetail {
  id: string
  registrationId: string
  qrCode: string
  status: "issued" | "used" | "revoked"
  issuedAt: string
  bibNumber?: string
  fullName: string
  registrationStatus: string
  eventTitle: string
  eventSlug: string
  eventStartAt: string
  locationName: string
  city: string
  province: string
  categoryName: string
}

export function useMyTickets() {
  return useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => api.list<TicketDetail>("/account/tickets"),
  })
}

export function useMyTicket(id: string | undefined) {
  return useQuery({
    queryKey: ["my-ticket", id],
    queryFn: () => api.get<TicketDetail>(`/account/tickets/${id}`),
    enabled: Boolean(id),
  })
}

export function useSimulatePaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.post(`/dev/payments/${orderId}/simulate`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-registration"] })
      void queryClient.invalidateQueries({ queryKey: ["my-registrations"] })
      void queryClient.invalidateQueries({ queryKey: ["my-tickets"] })
      void queryClient.invalidateQueries({ queryKey: ["my-ticket"] })
    },
  })
}

export function useSimulateExpire() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.post(`/dev/payments/${orderId}/expire`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-registration"] })
      void queryClient.invalidateQueries({ queryKey: ["my-registrations"] })
    },
  })
}

export interface CheckinDetail {
  id: string
  ticketId: string
  checkedInBy?: string
  checkedInByName?: string
  pickupType: "self" | "representative"
  representativeName?: string
  representativeNote?: string
  createdOffline: boolean
  scannedAt: string
  syncedAt?: string
}

export interface ManifestParticipant {
  registrationId: string
  ticketId: string
  qrCode: string
  bibNumber?: string
  fullName: string
  categoryName: string
  ticketStatus: "issued" | "used" | "revoked"
  registrationStatus: string
  checkin?: CheckinDetail
}

export interface CheckinManifest {
  eventId: string
  eventTitle: string
  eventStartAt: string
  generatedAt: string
  total: number
  checkedIn: number
  participants: ManifestParticipant[]
}

export interface CheckinScanInput {
  qrCode: string
  pickupType: "self" | "representative"
  representativeName?: string
  representativeNote?: string
  clientId?: string
  createdOffline?: boolean
  scannedAt?: string
}

export interface CheckinResult {
  status: "checked_in" | "already_checked_in" | "invalid"
  message: string
  participant?: ManifestParticipant
  checkin?: CheckinDetail
}

export function useCheckinManifest(eventId: string | undefined) {
  return useQuery({
    queryKey: ["checkin-manifest", eventId],
    queryFn: () => api.get<CheckinManifest>(`/organizer/events/${eventId}/checkin/manifest`),
    enabled: Boolean(eventId),
  })
}

export function useScanCheckin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CheckinScanInput) => api.post<CheckinResult>("/organizer/checkin/scan", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["checkin-manifest"] })
    },
  })
}

export function useSyncCheckins() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (items: CheckinScanInput[]) =>
      api.post<{ results: CheckinResult[] }>("/organizer/checkin/sync", { items }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["checkin-manifest"] })
    },
  })
}

export interface OrganizerDashboardData {
  registrationsByCategory: { category: string; terisi: number; kuota: number }[]
  registrationTrend: { date: string; pendaftar: number; lunas: number }[]
  jerseyRecap: { size: string; count: number }[]
  money: { collected: number; disbursed: number; held: number; estimated: number }
  pendingVerifications: number
  paidRegistrations: number
}

export interface AdminDashboardData {
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

export function useOrganizerDashboard() {
  return useQuery({
    queryKey: ["organizer-dashboard"],
    queryFn: () => api.get<OrganizerDashboardData>("/organizer/dashboard"),
  })
}

export function useAdminDashboard(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get<AdminDashboardData>("/admin/dashboard"),
    enabled: options.enabled ?? true,
  })
}

export interface AppNotification {
  id: string
  recipientType: string
  recipientId: string
  channel: "email" | "whatsapp" | "in_app"
  templateKey: string
  title: string
  body: string
  status: string
  readAt?: string
  sentAt?: string
  createdAt: string
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.list<AppNotification>("/account/notifications"),
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/account/notifications/${id}/read`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post("/account/notifications/read-all", {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] })
    },
  })
}

export interface BroadcastItem {
  id: string
  eventId: string
  sentByName: string
  channel: string
  subject: string
  message: string
  recipients: number
  sentAt: string
}

export function useBroadcasts(eventId: string | undefined) {
  return useQuery({
    queryKey: ["broadcasts", eventId],
    queryFn: () => api.list<BroadcastItem>(`/organizer/events/${eventId}/broadcasts`),
    enabled: Boolean(eventId),
  })
}

export function useCreateBroadcast(eventId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { channel: string; subject: string; message: string }) =>
      api.post<BroadcastItem>(`/organizer/events/${eventId}/broadcasts`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["broadcasts", eventId] })
    },
  })
}

export function useExportParticipants() {
  return useMutation({
    mutationFn: ({ eventId, filename }: { eventId: string; filename: string }) =>
      api.download(`/organizer/events/${eventId}/participants/export`, filename),
  })
}

export interface FinanceSummary {
  gmv: number
  platformRevenue: number
  collected: number
  refunded: number
  disbursed: number
  held: number
  pendingDisbursements: number
  pendingRefunds: number
}

export interface RefundItem {
  id: string
  paymentId: string
  registrationId: string
  amount: number
  reasonType: string
  status: string
  gatewayRef?: string
  feeBorneBy: string
  requestedAt: string
  processedAt?: string
  note?: string
  eventTitle: string
  organizationName: string
  participantName: string
  orderId: string
}

export interface DisbursementItem {
  id: string
  eventId: string
  organizationId: string
  stage: number
  percentage: number
  amount: number
  status: string
  approvedBy?: string
  requestedAt?: string
  approvedAt?: string
  paidAt?: string
  payoutRef?: string
  note?: string
  createdAt: string
  eventTitle: string
  organizationName?: string
  bankName?: string
  accountNumberLast4?: string
}

export interface DisputeItem {
  id: string
  eventId: string
  eventTitle: string
  registrationId?: string
  reporterType: string
  reporterName: string
  disputeType: string
  description: string
  status: string
  resolution?: string
  createdAt: string
  resolvedAt?: string
}

export interface AuditItem {
  id: string
  actorType: string
  actorName: string
  action: string
  entityType: string
  entityId?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  ipAddress?: string
  createdAt: string
}

export function useAdminFinance() {
  return useQuery({
    queryKey: ["admin-finance"],
    queryFn: () => api.get<FinanceSummary>("/admin/finance"),
  })
}

export function useOrganizerFinance() {
  return useQuery({
    queryKey: ["organizer-finance"],
    queryFn: () => api.get<FinanceSummary>("/organizer/finance"),
  })
}

export function useAdminRefunds(status?: string) {
  return useQuery({
    queryKey: ["admin-refunds", status],
    queryFn: () => api.list<RefundItem>(`/admin/refunds${toQuery({ status })}`),
  })
}

export function useCreateRefund() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ registrationId, reasonType, amount, note }: {
      registrationId: string
      reasonType: string
      amount?: number
      note?: string
    }) => api.post<RefundItem>(`/admin/registrations/${registrationId}/refund`, { reasonType, amount, note }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-refunds"] })
      void queryClient.invalidateQueries({ queryKey: ["admin-finance"] })
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
    },
  })
}

export function useAdminDisbursements() {
  return useQuery({
    queryKey: ["admin-disbursements"],
    queryFn: () => api.list<DisbursementItem>("/admin/disbursements"),
  })
}

export function useOrganizerDisbursements() {
  return useQuery({
    queryKey: ["organizer-disbursements"],
    queryFn: () => api.list<DisbursementItem>("/organizer/disbursements"),
  })
}

export function useCreateDisbursement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, stage, percentage, note }: {
      eventId: string
      stage: number
      percentage: number
      note?: string
    }) => api.post<DisbursementItem>(`/admin/events/${eventId}/disbursements`, { stage, percentage, note }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-disbursements"] })
      void queryClient.invalidateQueries({ queryKey: ["admin-finance"] })
    },
  })
}

export function useReviewDisbursement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      api.post<DisbursementItem>(`/admin/disbursements/${id}/${approve ? "approve" : "hold"}`, { note }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-disbursements"] })
      void queryClient.invalidateQueries({ queryKey: ["admin-finance"] })
    },
  })
}

export function useAdminDisputes() {
  return useQuery({
    queryKey: ["admin-disputes"],
    queryFn: () => api.list<DisputeItem>("/admin/disputes"),
  })
}

export function useReviewDispute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, resolution }: { id: string; action: "review" | "resolve" | "reject"; resolution?: string }) =>
      api.post<DisputeItem>(`/admin/disputes/${id}/${action}`, { resolution }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-disputes"] })
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] })
    },
  })
}

export function useAuditLogs(params: { actorType?: string; entityType?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => api.list<AuditItem>(`/admin/audit-logs${toQuery(params)}`),
  })
}
