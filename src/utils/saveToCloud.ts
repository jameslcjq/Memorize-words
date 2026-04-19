import { buildAuthHeaders, getAuthToken } from '@/lib/api'

/**
 * Fire-and-forget cloud save helper.
 * Sends a partial payload to /api/sync/upload.
 * Missing fields are silently skipped by the server.
 */
export async function saveToCloud(payload: Record<string, unknown>): Promise<void> {
  try {
    const token = getAuthToken()
    if (!token) return

    const res = await fetch('/api/sync/upload', {
      method: 'POST',
      headers: buildAuthHeaders({}, token),
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(errorText || `HTTP ${res.status}`)
    }
  } catch (e) {
    console.error('Cloud save failed:', e)
  }
}
