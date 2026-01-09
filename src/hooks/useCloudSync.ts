import { useWordStats } from '@/pages/Analysis/hooks/useWordStats'
import { isSyncingAtom, userInfoAtom } from '@/store'
import { db } from '@/utils/db'
import { gamificationDb } from '@/utils/db/gamification'
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

  // Upload Logic - Now includes ALL data
  const uploadData = useCallback(async () => {
    if (!userInfo) return

    // Daily stats summary
    const records =
      localStats?.all.map((item) => ({
        date: item.date,
        duration: item.duration || 0,
        wordCount: item.totalWordsCount,
      })) || []

    // Core practice data
    const wordRecords = await db.wordRecords.toArray()
    const chapterRecords = await db.chapterRecords.toArray()
    const reviewRecords = await db.reviewRecords.toArray()
    const spacedRepetitionRecords = await db.spacedRepetitionRecords.toArray()

    // Gamification data
    const pointsTransactions = await gamificationDb.pointsTransactions.toArray()
    const unlockedAchievements = await gamificationDb.unlockedAchievements.toArray()
    const dailyChallenges = await gamificationDb.dailyChallenges.toArray()

    // User settings from localStorage
    const userSettings = {
      currentDict: localStorage.getItem('currentDict'),
      selectedChapters: localStorage.getItem('selectedChapters'),
      exerciseMode: localStorage.getItem('exerciseMode'),
      learningPlan: localStorage.getItem('learningPlan'),
      loopWordConfig: localStorage.getItem('loopWordConfig'),
      pronunciationConfig: localStorage.getItem('pronunciation'),
      phoneticConfig: localStorage.getItem('phoneticConfig'),
      randomConfig: localStorage.getItem('randomConfig'),
      wordDictationConfig: localStorage.getItem('wordDictationConfig'),
      isOpenDarkModeAtom: localStorage.getItem('isOpenDarkModeAtom'),
    }

    const payload = {
      userId: userInfo.userId,
      timestamp: Date.now(),
      // Daily stats
      records,
      // Core data
      wordRecords,
      chapterRecords,
      reviewRecords,
      spacedRepetitionRecords,
      // Gamification
      pointsTransactions,
      unlockedAchievements,
      dailyChallenges,
      // Settings
      userSettings,
    }

    await fetch('/api/sync/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }, [userInfo, localStats])

  // Download Logic - Now includes ALL data
  const downloadData = useCallback(async () => {
    if (!userInfo) return
    const res = await fetch(`/api/sync/download?userId=${userInfo.userId}`)
    if (res.ok) {
      const json = await res.json()
      if (json.success) {
        setCloudStats(json.data) // Existing stats

        // Sync core records
        await db.transaction('rw', db.wordRecords, db.chapterRecords, db.reviewRecords, db.spacedRepetitionRecords, async () => {
          if (json.wordRecords?.length > 0) {
            await db.wordRecords.bulkPut(json.wordRecords)
          }
          if (json.chapterRecords?.length > 0) {
            await db.chapterRecords.bulkPut(json.chapterRecords)
          }
          if (json.reviewRecords?.length > 0) {
            await db.reviewRecords.bulkPut(json.reviewRecords)
          }
          if (json.spacedRepetitionRecords?.length > 0) {
            await db.spacedRepetitionRecords.bulkPut(json.spacedRepetitionRecords)
          }
        })

        // Sync gamification data
        await gamificationDb.transaction(
          'rw',
          gamificationDb.pointsTransactions,
          gamificationDb.unlockedAchievements,
          gamificationDb.dailyChallenges,
          async () => {
            if (json.pointsTransactions?.length > 0) {
              await gamificationDb.pointsTransactions.bulkPut(json.pointsTransactions)
            }
            if (json.unlockedAchievements?.length > 0) {
              await gamificationDb.unlockedAchievements.bulkPut(json.unlockedAchievements)
            }
            if (json.dailyChallenges?.length > 0) {
              await gamificationDb.dailyChallenges.bulkPut(json.dailyChallenges)
            }
          },
        )

        // Restore user settings
        if (json.userSettings) {
          const settings = json.userSettings
          if (settings.currentDict) localStorage.setItem('currentDict', settings.currentDict)
          if (settings.selectedChapters) localStorage.setItem('selectedChapters', settings.selectedChapters)
          if (settings.exerciseMode) localStorage.setItem('exerciseMode', settings.exerciseMode)
          if (settings.learningPlan) localStorage.setItem('learningPlan', settings.learningPlan)
          if (settings.loopWordConfig) localStorage.setItem('loopWordConfig', settings.loopWordConfig)
          if (settings.pronunciationConfig) localStorage.setItem('pronunciation', settings.pronunciationConfig)
          if (settings.phoneticConfig) localStorage.setItem('phoneticConfig', settings.phoneticConfig)
          if (settings.randomConfig) localStorage.setItem('randomConfig', settings.randomConfig)
          if (settings.wordDictationConfig) localStorage.setItem('wordDictationConfig', settings.wordDictationConfig)
          if (settings.isOpenDarkModeAtom) localStorage.setItem('isOpenDarkModeAtom', settings.isOpenDarkModeAtom)
        }
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
      console.log('Sync completed - all data synchronized')
    } catch (e) {
      console.error('Sync error', e)
    } finally {
      setIsSyncing(false)
    }
  }, [userInfo, isSyncing, uploadData, downloadData, setIsSyncing])

  return { syncData, isSyncing, cloudStats, localStats: localStats?.all || [] }
}
