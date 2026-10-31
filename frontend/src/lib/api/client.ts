const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1"

let accessToken: string | null = null
let refreshInFlight: Promise<boolean> | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export interface ApiMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ListResponse<T> {
  data: T[]
  meta: ApiMeta
}

export class ApiError extends Error {
  status: number
  code: string
  fields?: Record<string, string>
  requestId?: string

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
    requestId?: string,
  ) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.fields = fields
    this.requestId = requestId
  }
}

interface ErrorPayload {
  error?: {
    code?: string
    message?: string
    fields?: Record<string, string>
    requestId?: string
  }
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  const payload = text ? (JSON.parse(text) as T & ErrorPayload) : ({} as T & ErrorPayload)

  if (!res.ok) {
    const err = payload.error
    throw new ApiError(
      res.status,
      err?.code ?? "unknown_error",
      err?.message ?? "Terjadi kesalahan pada server.",
      err?.fields,
      err?.requestId,
    )
  }
  return payload
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
        if (!res.ok) {
          accessToken = null
          return false
        }
        const payload = (await res.json()) as { data: { accessToken: string } }
        accessToken = payload.data.accessToken
        return true
      } catch {
        accessToken = null
        return false
      } finally {
        refreshInFlight = null
      }
    })()
  }
  return refreshInFlight
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  retryOnUnauthorized?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, retryOnUnauthorized = true, headers, ...rest } = options
  const isFormData = body instanceof FormData

  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })

  if (res.status === 401 && retryOnUnauthorized && !path.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return request<T>(path, { ...options, retryOnUnauthorized: false })
    }
  }

  const payload = await readJson<{ data: T }>(res)
  return payload.data
}

async function requestList<T>(path: string, options: RequestOptions = {}): Promise<ListResponse<T>> {
  const { body, retryOnUnauthorized = true, headers, ...rest } = options
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (res.status === 401 && retryOnUnauthorized && !path.startsWith("/auth/")) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      return requestList<T>(path, { ...options, retryOnUnauthorized: false })
    }
  }

  return readJson<ListResponse<T>>(res)
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  list: <T>(path: string) => requestList<T>(path),
  refresh: refreshAccessToken,
}

export function toQuery(params: object) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ""
}
