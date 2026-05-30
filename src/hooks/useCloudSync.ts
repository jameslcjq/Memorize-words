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
import type { DailyChallengeRecord, PointsTransaction, UnlockedAchievement } from '@/typings/gamification'
import type { Pet, UserInventoryItem } from '@/typings/pet'
import { db } from '@/utils/db'
import type { IDeletedWordRecord } from '@/utils/db/deleted-word-record'
import type { IChapterRecord, IReviewRecord, IWordRecord } from '@/utils/db/record'
import type { SmartLearningRecord } from '@/utils/db/smart-learning-record'
import type { ISpacedRepetitionRecord } from '@/utils/db/spaced-repetition-record'
import { saveToCloud } from '@/utils/saveToCloud'
import dayjs from 'dayjs'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useState } from 'react'

function getPetUpdatedAt(pet: Pet | null): number {
  if (!pet) return 0
  return Math.max(pet.lastInteractedAt || 0, pet.createdAt || 0)
}

type CloudStudyStat = {
  date: string
  duration: number
  wordCount: number
}

type CloudSpacedRepetitionRecord = ISpacedRepetitionRecord & {
  easeFactor?: number
  intervalDays?: number
  nextReview?: number
  lastReviewed?: number
}

type UserSettingsPayload = Record<string, string | null>

type SyncDownloadResponse = {
  success?: boolean
  data?: CloudStudyStat[]
  wordRecords?: IWordRecord[]
  chapterRecords?: IChapterRecord[]
  pointsTransactions?: PointsTransaction[]
  unlockedAchievements?: UnlockedAchievement[]
  dailyChallenges?: DailyChallengeRecord[]
  reviewRecords?: IReviewRecord[]
  spacedRepetitionRecords?: CloudSpacedRepetitionRecord[]
  smartLearningRecords?: SmartLearningRecord[]
  deletedWordRecords?: IDeletedWordRecord[]
  pet?: Pet | null
  petInventory?: UserInventoryItem[]
  userSettings?: UserSettingsPayload
}

export const useCloudSync = () => {
  const userInfo = useAtomValue(userInfoAtom)
  const [isSyncing, setIsSyncing] = useAtom(isSyncingAtom)
  const [cloudStats, setCloudStats] = useState<CloudStudyStat[]>([])

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
    const deletedWordRecords = await db.deletedWordRecords.toArray()

    const userSettings: UserSettingsPayload = {
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

    const response = await fetch('/api/sync/upload', {
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
        deletedWordRecords,
        // Gamification & pet come from atoms (already cloud-synced on each action)
        pointsTransactions,
        unlockedAchievements,
        dailyChallenges,
        pet: pet || null,
        petInventory,
        userSettings,
      }),
    })
    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`)
    }
  }, [userInfo, localStats, pointsTransactions, unlockedAchievements, dailyChallenges, pet, petInventory])

  // Lightweight upload: only error book (word records)
  const uploadErrorBook = useCallback(async () => {
    const token = getAuthToken()
    if (!userInfo || !token) return
    try {
      const wordRecords = await db.wordRecords.toArray()
      const deletedWordRecords = await db.deletedWordRecords.toArray()
      const response = await fetch('/api/sync/upload', {
        method: 'POST',
        headers: buildAuthHeaders({}, token),
        body: JSON.stringify({ timestamp: Date.now(), wordRecords, deletedWordRecords, records: [] }),
      })
      if (!response.ok) {
        throw new Error(`Error book upload failed with status ${response.status}`)
      }
    } catch (e) {
      console.error('Error book sync failed:', e)
    }
  }, [userInfo])

  // Download: cloud is source of truth for gamification/pet; merge for word records
  const downloadData = useCallback(async (): Promise<boolean> => {
    const token = getAuthToken()
    if (!userInfo || !token) return false
    const res = await fetch('/api/sync/download', {
      headers: buildAuthHeaders({}, token),
    })
    if (!res.ok) {
      setCloudLoaded(true)
      return false
    }
    const json = (await res.json()) as SyncDownloadResponse
    if (!json.success) {
      setCloudLoaded(true)
      return false
    }

    setCloudStats(json.data || [])

    // Populate gamification atoms (simple overwrite — cloud is always up-to-date
    // because individual actions persist immediately)
    setPointsTransactions(Array.isArray(json.pointsTransactions) ? json.pointsTransactions : [])
    setUnlockedAchievements(Array.isArray(json.unlockedAchievements) ? json.unlockedAchievements : [])
    setDailyChallenges(Array.isArray(json.dailyChallenges) ? json.dailyChallenges : [])

    // Populate pet atoms. A missing cloud pet can mean "not synced yet", so do
    // not erase a locally restored pet unless the cloud has a newer pet record.
    const cloudPet = (json.pet || null) as Pet | null
    const cloudPetInventory = (Array.isArray(json.petInventory) ? json.petInventory : []) as UserInventoryItem[]
    const localPetWins = !!pet && (!cloudPet || getPetUpdatedAt(pet) > getPetUpdatedAt(cloudPet))
    const nextPet = localPetWins ? pet : cloudPet
    const nextPetInventory = localPetWins ? petInventory : cloudPetInventory

    setPet(nextPet)
    setHasPet(!!nextPet)
    setPetInventory(nextPetInventory)

    if (localPetWins) {
      await saveToCloud({ pet: nextPet, petInventory: nextPetInventory })
    }

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

    const deletedWordRecords = json.deletedWordRecords || []
    const wordRecords = json.wordRecords || []
    const chapterRecords = json.chapterRecords || []
    const reviewRecords = json.reviewRecords || []
    const spacedRepetitionRecords = json.spacedRepetitionRecords || []
    const smartLearningRecords = json.smartLearningRecords || []

    // Merge word records into Dexie (smart merge — last-write wins per record)
    await db.transaction(
      'rw',
      [db.wordRecords, db.chapterRecords, db.reviewRecords, db.spacedRepetitionRecords, db.smartLearningRecords, db.deletedWordRecords],
      async () => {
        const upsertDeletedWordRecord = async (record: IDeletedWordRecord) => {
          const existing = await db.deletedWordRecords.where('[dict+word]').equals([record.dict, record.word]).first()
          if (existing?.id !== undefined) {
            if (record.deletedAt > existing.deletedAt) {
              await db.deletedWordRecords.update(existing.id, { deletedAt: record.deletedAt })
            }
          } else {
            await db.deletedWordRecords.add({
              word: record.word,
              dict: record.dict,
              deletedAt: record.deletedAt,
            })
          }
        }

        const getDeletedAt = async (dict: string, word: string) => {
          const deletedRecord = await db.deletedWordRecords.where('[dict+word]').equals([dict, word]).first()
          return deletedRecord?.deletedAt || 0
        }

        if (deletedWordRecords.length) {
          for (const deletedRecord of deletedWordRecords) {
            await upsertDeletedWordRecord(deletedRecord)
            const localRecord = await db.wordRecords.where({ word: deletedRecord.word, dict: deletedRecord.dict }).first()
            if (localRecord?.id !== undefined && localRecord.timeStamp <= deletedRecord.deletedAt) {
              await db.wordRecords.delete(localRecord.id)
            }
          }
        }

        if (wordRecords.length > 0) {
          for (const cloudRecord of wordRecords) {
            const deletedAt = await getDeletedAt(cloudRecord.dict, cloudRecord.word)
            if (deletedAt >= cloudRecord.timeStamp) continue

            const localRecord = await db.wordRecords.where({ word: cloudRecord.word, dict: cloudRecord.dict }).first()
            if (localRecord) {
              const mergedWrongCount = Math.max(localRecord.wrongCount, cloudRecord.wrongCount)
              const mergedCorrectCount = Math.max(localRecord.correctCount || 0, cloudRecord.correctCount || 0)
              const mergedTimeStamp = Math.max(localRecord.timeStamp, cloudRecord.timeStamp)
              if (localRecord.id !== undefined && mergedCorrectCount >= 3) {
                await db.wordRecords.delete(localRecord.id)
                await upsertDeletedWordRecord({ word: cloudRecord.word, dict: cloudRecord.dict, deletedAt: mergedTimeStamp })
              } else if (localRecord.id !== undefined) {
                await db.wordRecords.update(localRecord.id, {
                  wrongCount: mergedWrongCount,
                  correctCount: mergedCorrectCount,
                  timeStamp: mergedTimeStamp,
                  mistakes: cloudRecord.wrongCount > localRecord.wrongCount ? cloudRecord.mistakes : localRecord.mistakes,
                  mode: mergedTimeStamp === cloudRecord.timeStamp ? cloudRecord.mode : localRecord.mode,
                })
              }
            } else if ((cloudRecord.correctCount || 0) < 3) {
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
        if (chapterRecords.length > 0) {
          for (const c of chapterRecords) {
            const exists = await db.chapterRecords.where({ dict: c.dict, chapter: c.chapter, timeStamp: c.timeStamp }).first()
            if (!exists) await db.chapterRecords.add(c)
          }
        }
        if (reviewRecords.length > 0) {
          for (const c of reviewRecords) {
            const exists = await db.reviewRecords.where('[dict+createTime]').equals([c.dict, c.createTime]).first()
            if (!exists) {
              await db.reviewRecords.add(c)
            } else if (c.isFinished && !exists.isFinished && exists.id !== undefined) {
              await db.reviewRecords.update(exists.id, { isFinished: c.isFinished })
            }
          }
        }
        if (spacedRepetitionRecords.length > 0) {
          for (const c of spacedRepetitionRecords) {
            const local = await db.spacedRepetitionRecords.where('[word+dict]').equals([c.word, c.dict]).first()
            const cloudLastReview = c.lastReviewed || c.lastReviewDate || 0
            const easinessFactor = c.easeFactor || c.easinessFactor || 2.5
            const interval = c.intervalDays || c.interval || 0
            const nextReviewDate = c.nextReview || c.nextReviewDate || 0
            if (local) {
              if (local.id !== undefined && cloudLastReview > local.lastReviewDate) {
                await db.spacedRepetitionRecords.update(local.id, {
                  easinessFactor,
                  interval,
                  repetitions: c.repetitions || 0,
                  nextReviewDate,
                  lastReviewDate: cloudLastReview,
                })
              } else {
                // Keep local record when it is newer.
              }
            } else {
              await db.spacedRepetitionRecords.add({
                word: c.word,
                dict: c.dict,
                easinessFactor,
                interval,
                repetitions: c.repetitions || 0,
                nextReviewDate,
                lastReviewDate: cloudLastReview,
              })
            }
          }
        }
        if (smartLearningRecords.length > 0) {
          for (const c of smartLearningRecords) {
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
    return true
  }, [
    userInfo,
    pet,
    petInventory,
    setPointsTransactions,
    setUnlockedAchievements,
    setDailyChallenges,
    setPet,
    setPetInventory,
    setHasPet,
    setCloudLoaded,
  ])

  const downloadOnly = useCallback(async (): Promise<boolean> => {
    if (!userInfo || isSyncing) return false
    setIsSyncing(true)
    try {
      return await downloadData()
    } catch (e) {
      console.error('Download error:', e)
      return false
    } finally {
      setCloudLoaded(true)
      setIsSyncing(false)
    }
  }, [userInfo, isSyncing, downloadData, setCloudLoaded, setIsSyncing])

  const uploadOnly = useCallback(async (): Promise<boolean> => {
    if (!userInfo || isSyncing) return false
    setIsSyncing(true)
    try {
      await uploadData()
      return true
    } catch (e) {
      console.error('Upload error:', e)
      return false
    } finally {
      setIsSyncing(false)
    }
  }, [userInfo, isSyncing, uploadData, setIsSyncing])

  const syncData = useCallback(async () => {
    if (!userInfo || isSyncing) return
    setIsSyncing(true)
    try {
      await uploadData()
      await downloadData()
    } catch (e) {
      console.error('Sync error', e)
    } finally {
      setIsSyncing(false)
    }
  }, [userInfo, isSyncing, uploadData, downloadData, setIsSyncing])

  return { syncData, uploadOnly, downloadOnly, uploadErrorBook, isSyncing, cloudStats, localStats: localStats?.all || [] }
}
