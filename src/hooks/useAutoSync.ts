/**
 * Auto Sync Hook - Provides periodic background sync every 1 minute
 * Use this hook in the main App component to enable automatic cloud sync
 */
import { useCloudSync } from './useCloudSync'
import { userInfoAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useEffect, useRef } from 'react'

const SYNC_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
// 避免每次切回标签页都触发一次全量下载/合并：距上次同步不足该间隔时跳过。
const VISIBILITY_MIN_GAP_MS = 2 * 60 * 1000 // 2 minutes

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

    // Set up periodic sync every 1 minute
    if (!intervalRef.current) {
      console.log('[AutoSync] Starting periodic sync (every 1 minute)')
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
