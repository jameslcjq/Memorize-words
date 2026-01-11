/**
 * Cloud Sync Service - Standalone functions for automatic error book sync
 * These can be called from anywhere, not dependent on React hooks
 */
import { db } from './index'

// Debounce timer for upload
let uploadTimer: ReturnType<typeof setTimeout> | null = null
const DEBOUNCE_MS = 5000 // Wait 5 seconds after last change before uploading

/**
 * Get user info from localStorage (matches userInfoAtom structure)
 */
function getUserInfo(): { userId: string } | null {
  const stored = localStorage.getItem('userInfo')
  if (!stored) return null
  try {
    return JSON.parse(stored)
  } catch {
    return null
  }
}

/**
 * Upload error book (wordRecords) to cloud
 * Called internally after debounce
 */
async function doUploadErrorBook(): Promise<void> {
  const userInfo = getUserInfo()
  if (!userInfo) return

  try {
    const wordRecords = await db.wordRecords.toArray()

    const payload = {
      userId: userInfo.userId,
      timestamp: Date.now(),
      wordRecords,
      records: [], // Required by API for study_records, empty for lightweight sync
    }

    const res = await fetch('/api/sync/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      console.log('[CloudSync] Error book synced to cloud')
    } else {
      console.warn('[CloudSync] Upload failed:', res.status)
    }
  } catch (e) {
    console.error('[CloudSync] Error book sync failed:', e)
  }
}

/**
 * Schedule an error book upload with debouncing
 * Call this after saving a word record
 */
export function scheduleErrorBookSync(): void {
  const userInfo = getUserInfo()
  if (!userInfo) return // Not logged in, skip sync

  // Clear previous timer
  if (uploadTimer) {
    clearTimeout(uploadTimer)
  }

  // Schedule new upload
  uploadTimer = setTimeout(() => {
    doUploadErrorBook()
    uploadTimer = null
  }, DEBOUNCE_MS)
}
