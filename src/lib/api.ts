// import { toast } from 'react-hot-toast'

const API_BASE = '/api'

interface ApiResult<T = any> {
  success?: boolean
  error?: string
  token?: string
  user?: any
  data?: T
  updated_at?: number
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResult<T>> {
  try {
    const token = localStorage.getItem('token')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    } as Record<string, string>

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
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
    upload: (data: any) => request('/sync/upload', { method: 'POST', body: JSON.stringify({ data }) }),

    download: () => request('/sync/download', { method: 'GET' }),
  },
}
