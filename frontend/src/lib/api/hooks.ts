import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api, toQuery } from "@/lib/api/client"
import type { Event, Organization } from "@/types"

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
