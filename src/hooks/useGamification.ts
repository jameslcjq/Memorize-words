// Gamification Hook - reads/writes jotai atoms, persists to cloud on each action
import { dailyChallengesAtom, pointsTransactionsAtom, totalPointsAtom, unlockedAchievementsAtom, userInfoAtom } from '@/store'
import { ACHIEVEMENTS, ALL_EXERCISE_MODES } from '@/typings/gamification'
import type { Achievement, DailyChallengeRecord, GamificationStats, PointsTransaction } from '@/typings/gamification'
import { db } from '@/utils/db'
import { saveToCloud } from '@/utils/saveToCloud'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useMemo, useState } from 'react'

export function useGamification() {
  const [newlyUnlockedAchievement, setNewlyUnlockedAchievement] = useState<Achievement | null>(null)

  const userInfo = useAtomValue(userInfoAtom)
  const totalPoints = useAtomValue(totalPointsAtom)
  const unlockedAchievements = useAtomValue(unlockedAchievementsAtom)
  const dailyChallenges = useAtomValue(dailyChallengesAtom)

  const setPointsTransactions = useSetAtom(pointsTransactionsAtom)
  const setUnlockedAchievements = useSetAtom(unlockedAchievementsAtom)
  const setDailyChallenges = useSetAtom(dailyChallengesAtom)

  // Add a points transaction and immediately persist to cloud
  const addPoints = useCallback(
    async (amount: number, reason: PointsTransaction['reason'], details?: string) => {
      const newTx: PointsTransaction = { amount, reason, timestamp: Date.now(), details }
      setPointsTransactions((prev) => [...prev, newTx])
      if (userInfo) {
        await saveToCloud(userInfo.userId, { pointsTransactions: [newTx] })
      }
    },
    [userInfo, setPointsTransactions],
  )

  const awardWordPoints = useCallback(
    async (comboCount = 1) => {
      const basePoints = 10
      const comboBonus = comboCount > 1 ? Math.min(comboCount * 2, 20) : 0
      const total = basePoints + comboBonus
      if (comboBonus > 0) {
        await addPoints(basePoints, 'word_correct')
        await addPoints(comboBonus, 'combo_bonus', `${comboCount}连击`)
      } else {
        await addPoints(basePoints, 'word_correct')
      }
      return total
    },
    [addPoints],
  )

  const awardChapterPoints = useCallback(
    async (isPerfect: boolean) => {
      const basePoints = 30
      const perfectBonus = isPerfect ? 50 : 0
      await addPoints(basePoints + perfectBonus, 'chapter_complete', isPerfect ? '完美通关' : undefined)
      return basePoints + perfectBonus
    },
    [addPoints],
  )

  const awardDailyChallengePoints = useCallback(
    async (score: number) => {
      const basePoints = 50
      const bonusPoints = Math.floor(score / 10) * 5
      await addPoints(basePoints + bonusPoints, 'daily_challenge', `得分: ${score}`)
      return basePoints + bonusPoints
    },
    [addPoints],
  )

  // Save daily challenge record (idempotent: one record per day)
  const saveDailyChallenge = useCallback(
    async (record: Omit<DailyChallengeRecord, 'id'>) => {
      const today = new Date().toISOString().split('T')[0]
      const alreadyExists = dailyChallenges.some((c) => c.date === today)
      if (alreadyExists) return
      setDailyChallenges((prev) => [...prev, record as DailyChallengeRecord])
      if (userInfo) {
        await saveToCloud(userInfo.userId, { dailyChallenges: [record] })
      }
    },
    [dailyChallenges, userInfo, setDailyChallenges],
  )

  // Derived: is today's challenge already done?
  const isTodayChallengeCompleted = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    return dailyChallenges.some((c) => c.date === today && !!c.completedAt)
  }, [dailyChallenges])

  // Build stats (word/chapter data still in main Dexie db)
  const getStats = useCallback(async (): Promise<GamificationStats> => {
    const [wordRecordCount, chapterRecords] = await Promise.all([db.wordRecords.count(), db.chapterRecords.toArray()])

    const dates = new Set(chapterRecords.map((r) => new Date(r.timeStamp).toISOString().split('T')[0]))
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (dates.has(d.toISOString().split('T')[0])) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    return {
      totalPoints,
      totalWordsCompleted: wordRecordCount,
      currentStreak: streak,
      longestStreak: streak,
      dailyChallengesCompleted: dailyChallenges.length,
      modesTriedSet: new Set(chapterRecords.map((r) => r.mode || 'unknown')),
      perfectChapters: chapterRecords.filter((r) => r.wrongCount === 0 && r.wordCount > 0).length,
      errorBookCleared: 0,
    }
  }, [totalPoints, dailyChallenges])

  // Check and unlock achievements
  const checkAchievements = useCallback(async () => {
    const stats = await getStats()
    const newlyUnlocked: Achievement[] = []
    const newlyUnlockedIds = new Set<string>()
    const todayStr = new Date().toISOString().split('T')[0]
    const todayChallenge = dailyChallenges.find((c) => c.date === todayStr)

    for (const achievement of ACHIEVEMENTS) {
      const alreadyUnlocked = unlockedAchievements.some((u) => u.achievementId === achievement.id) || newlyUnlockedIds.has(achievement.id)
      if (alreadyUnlocked) continue

      let shouldUnlock = false
      switch (achievement.condition.type) {
        case 'words_completed':
          shouldUnlock = stats.totalWordsCompleted >= achievement.condition.count
          break
        case 'streak_days':
          shouldUnlock = stats.currentStreak >= achievement.condition.count
          break
        case 'perfect_chapter':
          shouldUnlock = stats.perfectChapters >= 1
          break
        case 'error_book_cleared':
          shouldUnlock = stats.errorBookCleared >= achievement.condition.count
          break
        case 'daily_challenges':
          shouldUnlock = stats.dailyChallengesCompleted >= achievement.condition.count
          break
        case 'points_earned':
          shouldUnlock = stats.totalPoints >= achievement.condition.count
          break
        case 'all_modes_tried': {
          const required = ALL_EXERCISE_MODES.filter((m) => m !== 'daily-challenge')
          shouldUnlock = required.every((m) => stats.modesTriedSet.has(m))
          break
        }
        case 'daily_challenge_score':
          shouldUnlock = todayChallenge ? todayChallenge.score >= achievement.condition.minScore : false
          break
        case 'all_achievements': {
          const others = ACHIEVEMENTS.filter((a) => a.id !== 'legendary')
          const allIds = new Set([...unlockedAchievements.map((u) => u.achievementId), ...newlyUnlockedIds])
          shouldUnlock = others.every((a) => allIds.has(a.id))
          break
        }
      }

      if (shouldUnlock) {
        newlyUnlockedIds.add(achievement.id)
        const newAch = { achievementId: achievement.id, unlockedAt: Date.now() }
        setUnlockedAchievements((prev) => [...prev, newAch])
        if (userInfo) {
          await saveToCloud(userInfo.userId, { unlockedAchievements: [newAch] })
        }
        await addPoints(achievement.points, 'achievement_unlock', achievement.name)
        newlyUnlocked.push(achievement)
      }
    }

    if (newlyUnlocked.length > 0) {
      setNewlyUnlockedAchievement(newlyUnlocked[0])
    }
    return newlyUnlocked
  }, [getStats, unlockedAchievements, dailyChallenges, userInfo, addPoints, setUnlockedAchievements])

  const clearAchievementToast = useCallback(() => {
    setNewlyUnlockedAchievement(null)
  }, [])

  return {
    totalPoints,
    unlockedAchievements,
    newlyUnlockedAchievement,
    clearAchievementToast,
    addPoints,
    awardWordPoints,
    awardChapterPoints,
    awardDailyChallengePoints,
    saveDailyChallenge,
    checkAchievements,
    getStats,
    isTodayChallengeCompleted,
  }
}
