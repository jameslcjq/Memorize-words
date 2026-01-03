import { useWordStats } from '@/pages/Analysis/hooks/useWordStats'
import { isSyncingAtom, userInfoAtom } from '@/store'
import dayjs from 'dayjs'
import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useState } from 'react'

export const useCloudSync = () => {
  const userInfo = useAtomValue(userInfoAtom)
  const [isSyncing, setIsSyncing] = useAtom(isSyncingAtom)
  const [cloudStats, setCloudStats] = useState<any[]>([])

  // Local stats (Last 365 days)
  const start = dayjs().subtract(1, 'year').unix()
  const end = dayjs().unix()
  const { stats: localStats } = useWordStats(start, end)

  // Upload Logic
  const uploadData = useCallback(async () => {
    if (!userInfo) return
    const records =
      localStats?.all.map((item) => ({
        date: item.date,
        duration: item.duration || 0,
        wordCount: item.totalWordsCount,
      })) || []

    if (records.length === 0) return

    await fetch('/api/sync/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userInfo.userId, records }),
    })
  }, [userInfo, localStats])

  // Download Logic
  const downloadData = useCallback(async () => {
    if (!userInfo) return
    const res = await fetch(`/api/sync/download?userId=${userInfo.userId}`)
    if (res.ok) {
      const json = await res.json()
      if (json.success) {
        setCloudStats(json.data)
      }
    }
  }, [userInfo])

  // Combined Sync Action
  const syncData = useCallback(async () => {
    if (!userInfo || isSyncing) return
    setIsSyncing(true)
    try {
      // Parallel upload and download
      await Promise.all([uploadData(), downloadData()])
      console.log('Sync completed')
    } catch (e) {
      console.error('Sync error', e)
    } finally {
      setIsSyncing(false)
    }
  }, [userInfo, isSyncing, uploadData, downloadData])

  return { syncData, isSyncing, cloudStats, localStats: localStats?.all || [] }
}
