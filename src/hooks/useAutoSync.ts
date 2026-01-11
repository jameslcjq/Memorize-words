/**
 * Auto Sync Hook - Provides periodic background sync every 3 minutes
 * Use this hook in the main App component to enable automatic cloud sync
 */
import { useCloudSync } from './useCloudSync'
import { userInfoAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useEffect, useRef } from 'react'

const SYNC_INTERVAL_MS = 3 * 60 * 1000 // 3 minutes

export const useAutoSync = () => {
  const userInfo = useAtomValue(userInfoAtom)
  const { syncData, isSyncing, downloadOnly } = useCloudSync()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasInitialSyncRef = useRef(false)

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

    // Set up periodic sync every 3 minutes
    if (!intervalRef.current) {
      console.log('[AutoSync] Starting periodic sync (every 3 minutes)')
      intervalRef.current = setInterval(() => {
        if (!isSyncing) {
          console.log('[AutoSync] Periodic sync triggered')
          syncData()
        }
      }, SYNC_INTERVAL_MS)
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [userInfo, syncData, downloadOnly, isSyncing])

  return { isSyncing }
}
