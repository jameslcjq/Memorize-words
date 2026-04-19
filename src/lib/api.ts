// import { toast } from 'react-hot-toast'

const API_BASE = '/api'
const DEFAULT_AUTH_STORAGE_KEY = 'token'

interface ApiResult<T = any> {
  success?: boolean
  error?: string
  token?: string
  user?: any
  data?: T
  updated_at?: number
}

export function getAuthToken(storage: Storage = localStorage, key = DEFAULT_AUTH_STORAGE_KEY): string | null {
  return storage.getItem(key)
}

export function setAuthToken(token: string, storage: Storage = localStorage, key = DEFAULT_AUTH_STORAGE_KEY): void {
  storage.setItem(key, token)
}

export function clearAuthToken(storage: Storage = localStorage, key = DEFAULT_AUTH_STORAGE_KEY): void {
  storage.removeItem(key)
}

export function buildAuthHeaders(headers: HeadersInit = {}, token: string | null = getAuthToken()): Headers {
  const mergedHeaders = new Headers(headers)

  if (!mergedHeaders.has('Content-Type')) {
    mergedHeaders.set('Content-Type', 'application/json')
  }

  if (token) {
    mergedHeaders.set('Authorization', `Bearer ${token}`)
  }

  return mergedHeaders
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: buildAuthHeaders(options.headers),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`)
    }

    return data
  } catch (error: any) {
    console.error('API Request Error:', error)
    throw error
  }
}

export const api = {
  auth: {
    register: (username: string, password: string, nickname?: string) =>
      request('/auth/register', { method: 'POST', body: JSON.stringify({ username, password, nickname }) }),

    login: (username: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  },
  sync: {
    upload: (data: any) => request('/sync', { method: 'POST', body: JSON.stringify({ data }) }),

    download: () => request('/sync', { method: 'GET' }),
  },
}
