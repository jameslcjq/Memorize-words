/**
 * Fire-and-forget cloud save helper.
 * Sends a partial payload to /api/sync/upload.
 * Missing fields are silently skipped by the server.
 */
export async function saveToCloud(userId: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch('/api/sync/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...payload }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(errorText || `HTTP ${res.status}`)
    }
  } catch (e) {
    console.error('Cloud save failed:', e)
  }
}
