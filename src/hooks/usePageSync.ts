/**
 * Page Sync Hook - Triggers sync when entering a specific page
 * Use this in pages that need fresh data (error book, statistics, profile)
 */
import { useCloudSync } from './useCloudSync'
import { userInfoAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useEffect } from 'react'

export const usePageSync = () => {
  const userInfo = useAtomValue(userInfoAtom)
  const { downloadOnly } = useCloudSync()

  useEffect(() => {
    if (userInfo) {
      console.log('[PageSync] Entering page, downloading latest data')
      downloadOnly()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

  return null
}
