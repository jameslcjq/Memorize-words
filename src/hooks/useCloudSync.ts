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

  // Upload only error book (wordRecords) - lightweight sync after practice
  const uploadErrorBook = useCallback(async () => {
    if (!userInfo) return

    try {
      const wordRecords = await db.wordRecords.toArray()

      const payload = {
        userId: userInfo.userId,
        timestamp: Date.now(),
        wordRecords,
        records: [], // Required by API but empty for lightweight sync
      }

      await fetch('/api/sync/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      console.log('Error book synced to cloud')
    } catch (e) {
      console.error('Error book sync failed:', e)
    }
  }, [userInfo])

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
          // Smart merge for wordRecords: use max-value strategy
          if (json.wordRecords?.length > 0) {
            for (const cloudRecord of json.wordRecords) {
              const localRecord = await db.wordRecords.where({ word: cloudRecord.word, dict: cloudRecord.dict }).first()

              if (localRecord) {
                // Merge: take max values for both wrongCount and correctCount
                const mergedWrongCount = Math.max(localRecord.wrongCount, cloudRecord.wrongCount)
                const mergedCorrectCount = Math.max(localRecord.correctCount || 0, cloudRecord.correctCount || 0)
                const mergedTimeStamp = Math.max(localRecord.timeStamp, cloudRecord.timeStamp)

                // If merged correctCount >= 3, delete the record (completed)
                if (mergedCorrectCount >= 3) {
                  await db.wordRecords.delete(localRecord.id!)
                } else {
                  // Otherwise update with merged values
                  await db.wordRecords.update(localRecord.id!, {
                    wrongCount: mergedWrongCount,
                    correctCount: mergedCorrectCount,
                    timeStamp: mergedTimeStamp,
                    // Use the record with higher wrongCount for mistakes and mode
                    mistakes: cloudRecord.wrongCount > localRecord.wrongCount ? cloudRecord.mistakes : localRecord.mistakes,
                    mode: mergedTimeStamp === cloudRecord.timeStamp ? cloudRecord.mode : localRecord.mode,
                  })
                }
              } else {
                // Cloud record not in local: only add if correctCount < 3 (not completed)
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
            // Smart merge: add cloud records that don't exist locally
            for (const cloudRecord of json.chapterRecords) {
              const exists = await db.chapterRecords
                .where('[dict+chapter+timeStamp]')
                .equals([cloudRecord.dict, cloudRecord.chapter, cloudRecord.timeStamp])
                .first()

              if (!exists) {
                await db.chapterRecords.add(cloudRecord)
              }
            }
          }
          if (json.reviewRecords?.length > 0) {
            // Smart merge: check for duplicates and update if needed
            for (const cloudRecord of json.reviewRecords) {
              const exists = await db.reviewRecords.where('[dict+createTime]').equals([cloudRecord.dict, cloudRecord.createTime]).first()

              if (!exists) {
                await db.reviewRecords.add(cloudRecord)
              } else if (cloudRecord.isFinished && !exists.isFinished) {
                // Cloud shows finished but local doesn't - update to finished
                await db.reviewRecords.update(exists.id!, { isFinished: cloudRecord.isFinished })
              }
            }
          }
          if (json.spacedRepetitionRecords?.length > 0) {
            // Smart merge: prefer the most recently reviewed record
            for (const cloudRecord of json.spacedRepetitionRecords) {
              const localRecord = await db.spacedRepetitionRecords.where('[word+dict]').equals([cloudRecord.word, cloudRecord.dict]).first()

              if (localRecord) {
                // Take the record with the most recent review
                // Note: server returns lastReviewed but client uses lastReviewDate
                const cloudLastReview = (cloudRecord as any).lastReviewed || cloudRecord.lastReviewDate || 0
                if (cloudLastReview > localRecord.lastReviewDate) {
                  // Map server field names to client field names
                  const mappedRecord = {
                    word: cloudRecord.word,
                    dict: cloudRecord.dict,
                    easinessFactor: (cloudRecord as any).easeFactor || cloudRecord.easinessFactor || 2.5,
                    interval: (cloudRecord as any).intervalDays || cloudRecord.interval || 0,
                    repetitions: cloudRecord.repetitions || 0,
                    nextReviewDate: (cloudRecord as any).nextReview || cloudRecord.nextReviewDate || 0,
                    lastReviewDate: cloudLastReview,
                  }
                  await db.spacedRepetitionRecords.update(localRecord.id!, mappedRecord)
                }
              } else {
                // Map server field names to client field names for new records
                const mappedRecord = {
                  word: cloudRecord.word,
                  dict: cloudRecord.dict,
                  easinessFactor: (cloudRecord as any).easeFactor || cloudRecord.easinessFactor || 2.5,
                  interval: (cloudRecord as any).intervalDays || cloudRecord.interval || 0,
                  repetitions: cloudRecord.repetitions || 0,
                  nextReviewDate: (cloudRecord as any).nextReview || cloudRecord.nextReviewDate || 0,
                  lastReviewDate: (cloudRecord as any).lastReviewed || cloudRecord.lastReviewDate || 0,
                }
                await db.spacedRepetitionRecords.add(mappedRecord)
              }
            }
          }
        })

        // Sync gamification data
        await gamificationDb.transaction(
          'rw',
          gamificationDb.pointsTransactions,
          gamificationDb.unlockedAchievements,
          gamificationDb.dailyChallenges,
          async () => {
            // 1. Points Transactions - Incremental sync with deduplication
            if (json.pointsTransactions?.length > 0) {
              for (const cloudTx of json.pointsTransactions) {
                // Check if transaction already exists (by timestamp + reason)
                const exists = await gamificationDb.pointsTransactions
                  .where('[timestamp+reason]')
                  .equals([cloudTx.timestamp, cloudTx.reason])
                  .first()

                if (!exists) {
                  // Only add if it doesn't exist - prevents duplicate points on refresh
                  await gamificationDb.pointsTransactions.add(cloudTx)
                }
              }
            }

            // 2. Unlocked Achievements - Keep earliest unlock time
            if (json.unlockedAchievements?.length > 0) {
              for (const cloudAch of json.unlockedAchievements) {
                const localAch = await gamificationDb.unlockedAchievements.get(cloudAch.achievementId)

                if (localAch) {
                  // If both exist, keep the one with earliest unlock time
                  if (cloudAch.unlockedAt < localAch.unlockedAt) {
                    await gamificationDb.unlockedAchievements.update(cloudAch.achievementId, {
                      unlockedAt: cloudAch.unlockedAt,
                    })
                  }
                } else {
                  // Add if doesn't exist locally
                  await gamificationDb.unlockedAchievements.add(cloudAch)
                }
              }
            }

            // 3. Daily Challenges - Merge based on date
            if (json.dailyChallenges?.length > 0) {
              for (const cloudChallenge of json.dailyChallenges) {
                const localChallenge = await gamificationDb.dailyChallenges.where('date').equals(cloudChallenge.date).first()

                if (localChallenge) {
                  // If cloud is completed but local isn't, update to completed
                  if (cloudChallenge.completedAt && !localChallenge.completedAt) {
                    await gamificationDb.dailyChallenges.update(localChallenge.id!, {
                      completedAt: cloudChallenge.completedAt,
                      words: cloudChallenge.words,
                      score: cloudChallenge.score,
                    })
                  }
                } else {
                  // Add if doesn't exist locally
                  await gamificationDb.dailyChallenges.add(cloudChallenge)
                }
              }
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

  // Download only - for restoring data after login
  const downloadOnly = useCallback(async () => {
    if (!userInfo || isSyncing) return
    setIsSyncing(true)
    try {
      await downloadData()
      console.log('Cloud data restored after login')
    } catch (e) {
      console.error('Download error:', e)
    } finally {
      setIsSyncing(false)
    }
  }, [userInfo, isSyncing, downloadData, setIsSyncing])

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

  return { syncData, downloadOnly, uploadErrorBook, isSyncing, cloudStats, localStats: localStats?.all || [] }
}
