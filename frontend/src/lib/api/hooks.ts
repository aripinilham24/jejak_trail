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
