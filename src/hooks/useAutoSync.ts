/**
 * Auto Sync Hook - Provides near-real-time background sync every 30 seconds
 * Use this hook in the main App component to enable automatic cloud sync
 */
import { useCloudSync } from './useCloudSync'
import { userInfoAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useEffect, useRef } from 'react'

const SYNC_INTERVAL_MS = 15 * 1000 // 15 seconds, keeping cross-device propagation below 30 seconds
// 避免每次切回标签页都触发一次全量下载/合并：距上次同步不足该间隔时跳过。
const VISIBILITY_MIN_GAP_MS = 10 * 1000 // 10 seconds

export const useAutoSync = () => {
  const userInfo = useAtomValue(userInfoAtom)
  const { syncData, isSyncing, downloadOnly } = useCloudSync()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasInitialSyncRef = useRef(false)
  const lastSyncAtRef = useRef(0)

  useEffect(() => {
    // Only start sync if user is logged in
    if (!userInfo) {
      // Clear interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      hasInitialSyncRef.current = false
      return
    }

    // Initial sync on login (download cloud data)
    if (!hasInitialSyncRef.current) {
      hasInitialSyncRef.current = true
      console.log('[AutoSync] User logged in, performing initial sync...')
      downloadOnly()
    }

    // Set up periodic near-real-time sync.
    if (!intervalRef.current) {
      console.log('[AutoSync] Starting periodic sync (every 15 seconds)')
      intervalRef.current = setInterval(() => {
        if (!isSyncing) {
          console.log('[AutoSync] Periodic sync triggered')
          lastSyncAtRef.current = Date.now()
          syncData()
        }
      }, SYNC_INTERVAL_MS)
    }

    // Sync when page becomes visible (user switches back to tab), but not more
    // often than VISIBILITY_MIN_GAP_MS to avoid hammering the sync endpoint.
    const handleVisibilityChange = () => {
      if (!document.hidden && userInfo && !isSyncing && Date.now() - lastSyncAtRef.current > VISIBILITY_MIN_GAP_MS) {
        console.log('[AutoSync] Page visible, triggering sync')
        lastSyncAtRef.current = Date.now()
        syncData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [userInfo, syncData, downloadOnly, isSyncing])

  return { isSyncing }
}
