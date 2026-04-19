import { buildAuthHeaders, getAuthToken } from '@/lib/api'
import { useWordStats } from '@/pages/Analysis/hooks/useWordStats'
import {
  cloudLoadedAtom,
  dailyChallengesAtom,
  hasPetAtom,
  isSyncingAtom,
  petAtom,
  petInventoryAtom,
  pointsTransactionsAtom,
  unlockedAchievementsAtom,
  userInfoAtom,
} from '@/store'
import { db } from '@/utils/db'
import dayjs from 'dayjs'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useState } from 'react'

export const useCloudSync = () => {
  const userInfo = useAtomValue(userInfoAtom)
  const [isSyncing, setIsSyncing] = useAtom(isSyncingAtom)
  const [cloudStats, setCloudStats] = useState<any[]>([])

  // Read atom values for upload
  const pointsTransactions = useAtomValue(pointsTransactionsAtom)
  const unlockedAchievements = useAtomValue(unlockedAchievementsAtom)
  const dailyChallenges = useAtomValue(dailyChallengesAtom)
  const pet = useAtomValue(petAtom)
  const petInventory = useAtomValue(petInventoryAtom)

  // Setters for download
  const setPointsTransactions = useSetAtom(pointsTransactionsAtom)
  const setUnlockedAchievements = useSetAtom(unlockedAchievementsAtom)
  const setDailyChallenges = useSetAtom(dailyChallengesAtom)
  const setPet = useSetAtom(petAtom)
  const setPetInventory = useSetAtom(petInventoryAtom)
  const setHasPet = useSetAtom(hasPetAtom)
  const setCloudLoaded = useSetAtom(cloudLoadedAtom)

  const start = dayjs().subtract(1, 'year').unix()
  const end = dayjs().unix()
  const { stats: localStats } = useWordStats(start, end)

  // Upload all data: word records from Dexie + gamification/pet from atoms
  const uploadData = useCallback(async () => {
    const token = getAuthToken()
    if (!userInfo || !token) return

    const records =
      localStats?.all.map((item) => ({
        date: item.date,
        duration: item.duration || 0,
        wordCount: item.totalWordsCount,
      })) || []

    const wordRecords = await db.wordRecords.toArray()
    const chapterRecords = await db.chapterRecords.toArray()
    const reviewRecords = await db.reviewRecords.toArray()
    const spacedRepetitionRecords = await db.spacedRepetitionRecords.toArray()
    const smartLearningRecords = await db.smartLearningRecords.toArray()

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

    await fetch('/api/sync/upload', {
      method: 'POST',
      headers: buildAuthHeaders({}, token),
      body: JSON.stringify({
        timestamp: Date.now(),
        records,
        wordRecords,
        chapterRecords,
        reviewRecords,
        spacedRepetitionRecords,
        smartLearningRecords,
        // Gamification & pet come from atoms (already cloud-synced on each action)
        pointsTransactions,
        unlockedAchievements,
        dailyChallenges,
        pet: pet || null,
        petInventory,
        userSettings,
      }),
    })
  }, [userInfo, localStats, pointsTransactions, unlockedAchievements, dailyChallenges, pet, petInventory])

  // Lightweight upload: only error book (word records)
  const uploadErrorBook = useCallback(async () => {
    const token = getAuthToken()
    if (!userInfo || !token) return
    try {
      const wordRecords = await db.wordRecords.toArray()
      await fetch('/api/sync/upload', {
        method: 'POST',
        headers: buildAuthHeaders({}, token),
        body: JSON.stringify({ timestamp: Date.now(), wordRecords, records: [] }),
      })
    } catch (e) {
      console.error('Error book sync failed:', e)
    }
  }, [userInfo])

  // Download: cloud is source of truth for gamification/pet; merge for word records
  const downloadData = useCallback(async () => {
    const token = getAuthToken()
    if (!userInfo || !token) return
    const res = await fetch('/api/sync/download', {
      headers: buildAuthHeaders({}, token),
    })
    if (!res.ok) return
    const json = await res.json()
    if (!json.success) return

    setCloudStats(json.data || [])

    // Populate gamification atoms (simple overwrite — cloud is always up-to-date
    // because individual actions persist immediately)
    setPointsTransactions(Array.isArray(json.pointsTransactions) ? json.pointsTransactions : [])
    setUnlockedAchievements(Array.isArray(json.unlockedAchievements) ? json.unlockedAchievements : [])
    setDailyChallenges(Array.isArray(json.dailyChallenges) ? json.dailyChallenges : [])

    // Populate pet atoms
    setPet(json.pet || null)
    setHasPet(!!json.pet)
    setPetInventory(Array.isArray(json.petInventory) ? json.petInventory : [])

    setCloudLoaded(true)

    // Restore user settings
    if (json.userSettings) {
      const s = json.userSettings
      if (s.currentDict) localStorage.setItem('currentDict', s.currentDict)
      if (s.selectedChapters) localStorage.setItem('selectedChapters', s.selectedChapters)
      if (s.exerciseMode) localStorage.setItem('exerciseMode', s.exerciseMode)
      if (s.learningPlan) localStorage.setItem('learningPlan', s.learningPlan)
      if (s.loopWordConfig) localStorage.setItem('loopWordConfig', s.loopWordConfig)
      if (s.pronunciationConfig) localStorage.setItem('pronunciation', s.pronunciationConfig)
      if (s.phoneticConfig) localStorage.setItem('phoneticConfig', s.phoneticConfig)
      if (s.randomConfig) localStorage.setItem('randomConfig', s.randomConfig)
      if (s.wordDictationConfig) localStorage.setItem('wordDictationConfig', s.wordDictationConfig)
      if (s.isOpenDarkModeAtom) localStorage.setItem('isOpenDarkModeAtom', s.isOpenDarkModeAtom)
    }

    // Merge word records into Dexie (smart merge — last-write wins per record)
    await db.transaction(
      'rw',
      db.wordRecords,
      db.chapterRecords,
      db.reviewRecords,
      db.spacedRepetitionRecords,
      db.smartLearningRecords,
      async () => {
        if (json.wordRecords?.length > 0) {
          for (const cloudRecord of json.wordRecords) {
            const localRecord = await db.wordRecords.where({ word: cloudRecord.word, dict: cloudRecord.dict }).first()
            if (localRecord) {
              const mergedWrongCount = Math.max(localRecord.wrongCount, cloudRecord.wrongCount)
              const mergedCorrectCount = Math.max(localRecord.correctCount || 0, cloudRecord.correctCount || 0)
              const mergedTimeStamp = Math.max(localRecord.timeStamp, cloudRecord.timeStamp)
              if (mergedCorrectCount >= 3) {
                await db.wordRecords.delete(localRecord.id!)
              } else {
                await db.wordRecords.update(localRecord.id!, {
                  wrongCount: mergedWrongCount,
                  correctCount: mergedCorrectCount,
                  timeStamp: mergedTimeStamp,
                  mistakes: cloudRecord.wrongCount > localRecord.wrongCount ? cloudRecord.mistakes : localRecord.mistakes,
                  mode: mergedTimeStamp === cloudRecord.timeStamp ? cloudRecord.mode : localRecord.mode,
                })
              }
            } else {
              if ((cloudRecord.correctCount || 0) < 3) {
                await db.wordRecords.add({
                  word: cloudRecord.word,
                  dict: cloudRecord.dict,
                  chapter: cloudRecord.chapter,
                  timing: cloudRecord.timing || [],
                  wrongCount: cloudRecord.wrongCount,
                  correctCount: cloudRecord.correctCount || 0,
                  mistakes: cloudRecord.mistakes || {},
                  timeStamp: cloudRecord.timeStamp,
                  mode: cloudRecord.mode || 'typing',
                })
              }
            }
          }
        }
        if (json.chapterRecords?.length > 0) {
          for (const c of json.chapterRecords) {
            const exists = await db.chapterRecords.where('[dict+chapter+timeStamp]').equals([c.dict, c.chapter, c.timeStamp]).first()
            if (!exists) await db.chapterRecords.add(c)
          }
        }
        if (json.reviewRecords?.length > 0) {
          for (const c of json.reviewRecords) {
            const exists = await db.reviewRecords.where('[dict+createTime]').equals([c.dict, c.createTime]).first()
            if (!exists) {
              await db.reviewRecords.add(c)
            } else if (c.isFinished && !exists.isFinished) {
              await db.reviewRecords.update(exists.id!, { isFinished: c.isFinished })
            }
          }
        }
        if (json.spacedRepetitionRecords?.length > 0) {
          for (const c of json.spacedRepetitionRecords) {
            const local = await db.spacedRepetitionRecords.where('[word+dict]').equals([c.word, c.dict]).first()
            const cloudLastReview = (c as any).lastReviewed || c.lastReviewDate || 0
            if (local) {
              if (cloudLastReview > local.lastReviewDate) {
                await db.spacedRepetitionRecords.update(local.id!, {
                  easinessFactor: (c as any).easeFactor || c.easinessFactor || 2.5,
                  interval: (c as any).intervalDays || c.interval || 0,
                  repetitions: c.repetitions || 0,
                  nextReviewDate: (c as any).nextReview || c.nextReviewDate || 0,
                  lastReviewDate: cloudLastReview,
                })
              }
            } else {
              await db.spacedRepetitionRecords.add({
                word: c.word,
                dict: c.dict,
                easinessFactor: (c as any).easeFactor || c.easinessFactor || 2.5,
                interval: (c as any).intervalDays || c.interval || 0,
                repetitions: c.repetitions || 0,
                nextReviewDate: (c as any).nextReview || c.nextReviewDate || 0,
                lastReviewDate: cloudLastReview,
              })
            }
          }
        }
        if (json.smartLearningRecords?.length > 0) {
          for (const c of json.smartLearningRecords) {
            const exists = await db.smartLearningRecords
              .where('completedAt')
              .equals(c.completedAt)
              .and((r) => r.dict === c.dict && r.chapter === c.chapter && r.groupNumber === c.groupNumber)
              .first()
            if (!exists) {
              await db.smartLearningRecords.add({
                dict: c.dict,
                chapter: c.chapter,
                groupNumber: c.groupNumber,
                wordsCount: c.wordsCount,
                totalTime: c.totalTime,
                completedAt: c.completedAt,
                wordDetails: c.wordDetails,
              })
            }
          }
        }
      },
    )
  }, [userInfo, setPointsTransactions, setUnlockedAchievements, setDailyChallenges, setPet, setPetInventory, setHasPet, setCloudLoaded])

  const downloadOnly = useCallback(async () => {
    if (!userInfo || isSyncing) return
    setIsSyncing(true)
    try {
      await downloadData()
    } catch (e) {
      console.error('Download error:', e)
    } finally {
      setIsSyncing(false)
    }
  }, [userInfo, isSyncing, downloadData, setIsSyncing])

  const syncData = useCallback(async () => {
    if (!userInfo || isSyncing) return
    setIsSyncing(true)
    try {
      await Promise.all([uploadData(), downloadData()])
    } catch (e) {
      console.error('Sync error', e)
    } finally {
      setIsSyncing(false)
    }
  }, [userInfo, isSyncing, uploadData, downloadData, setIsSyncing])

  return { syncData, downloadOnly, uploadErrorBook, isSyncing, cloudStats, localStats: localStats?.all || [] }
}
