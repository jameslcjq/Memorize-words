// Gamification Hook - Core logic for points, achievements, and daily challenges
import { ACHIEVEMENTS, ALL_EXERCISE_MODES } from '@/typings/gamification'
import type { Achievement, GamificationStats, PointsTransaction } from '@/typings/gamification'
import { db } from '@/utils/db'
import {
  addPointsToDb,
  getDailyChallengeCount,
  getTodayChallenge,
  getTotalPoints,
  getUnlockedAchievements,
  isAchievementUnlocked,
  unlockAchievement,
} from '@/utils/db/gamification'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useState } from 'react'

/**
 * Main gamification hook
 */
export function useGamification() {
  const [newlyUnlockedAchievement, setNewlyUnlockedAchievement] = useState<Achievement | null>(null)

  // Live query for total points
  const totalPoints = useLiveQuery(() => getTotalPoints(), [], 0)

  // Live query for unlocked achievements
  const unlockedAchievements = useLiveQuery(() => getUnlockedAchievements(), [], [])

  // Add points with reason
  const addPoints = useCallback(async (amount: number, reason: PointsTransaction['reason'], details?: string) => {
    await addPointsToDb(amount, reason, details)
  }, [])

  // Award points for correct word
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

  // Award points for completing chapter
  const awardChapterPoints = useCallback(
    async (isPerfect: boolean) => {
      const basePoints = 30
      const perfectBonus = isPerfect ? 50 : 0
      await addPoints(basePoints + perfectBonus, 'chapter_complete', isPerfect ? '完美通关' : undefined)
      return basePoints + perfectBonus
    },
    [addPoints],
  )

  // Award points for daily challenge
  const awardDailyChallengePoints = useCallback(
    async (score: number) => {
      const basePoints = 50
      const bonusPoints = Math.floor(score / 10) * 5 // Extra 5 points for every 10 score
      await addPoints(basePoints + bonusPoints, 'daily_challenge', `得分: ${score}`)
      return basePoints + bonusPoints
    },
    [addPoints],
  )

  // Get gamification stats
  const getStats = useCallback(async (): Promise<GamificationStats> => {
    const [points, challenges, wordRecords, chapterRecords] = await Promise.all([
      getTotalPoints(),
      getDailyChallengeCount(),
      db.wordRecords.count(),
      db.chapterRecords.toArray(),
    ])

    // Calculate streak from chapter records
    const dates = new Set(chapterRecords.map((r) => new Date(r.timeStamp).toISOString().split('T')[0]))
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]
      if (dates.has(dateStr)) {
        streak++
      } else if (i > 0) {
        break
      }
    }

    // Get modes tried
    const modesTried = new Set(chapterRecords.map((r) => r.mode || 'unknown'))

    // Perfect chapters (all correct in chapter)
    const perfectChapters = chapterRecords.filter((r) => r.wrongCount === 0 && r.wordCount > 0).length

    // Error book cleared count (words removed from error book)
    // This is approximate - count words with correctCount >= 3 that were deleted
    const errorBookCleared = 0 // TODO: Need to track this separately

    return {
      totalPoints: points,
      totalWordsCompleted: wordRecords,
      currentStreak: streak,
      longestStreak: streak, // TODO: Track longest streak separately
      dailyChallengesCompleted: challenges,
      modesTriedSet: modesTried,
      perfectChapters,
      errorBookCleared,
    }
  }, [])

  // Check and unlock achievements
  const checkAchievements = useCallback(async () => {
    const stats = await getStats()
    const newlyUnlocked: Achievement[] = []

    for (const achievement of ACHIEVEMENTS) {
      const alreadyUnlocked = await isAchievementUnlocked(achievement.id)
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
          // Check if all modes except 'daily-challenge' and 'unknown' are tried
          const requiredModes = ALL_EXERCISE_MODES.filter((m) => m !== 'daily-challenge')
          shouldUnlock = requiredModes.every((m) => stats.modesTriedSet.has(m))
          break
        }
        case 'daily_challenge_score': {
          // Check latest daily challenge score
          const todayChallenge = await getTodayChallenge()
          shouldUnlock = todayChallenge ? todayChallenge.score >= achievement.condition.minScore : false
          break
        }
        case 'all_achievements': {
          // Check if all other achievements are unlocked
          const unlockedList = await getUnlockedAchievements()
          const otherAchievements = ACHIEVEMENTS.filter((a) => a.id !== 'legendary')
          shouldUnlock = otherAchievements.every((a) => unlockedList.some((u) => u.achievementId === a.id))
          break
        }
      }

      if (shouldUnlock) {
        const wasNewlyUnlocked = await unlockAchievement(achievement.id)
        if (wasNewlyUnlocked) {
          await addPoints(achievement.points, 'achievement_unlock', achievement.name)
          newlyUnlocked.push(achievement)
        }
      }
    }

    // Show toast for first newly unlocked achievement
    if (newlyUnlocked.length > 0) {
      setNewlyUnlockedAchievement(newlyUnlocked[0])
    }

    return newlyUnlocked
  }, [getStats, addPoints])

  // Clear achievement toast
  const clearAchievementToast = useCallback(() => {
    setNewlyUnlockedAchievement(null)
  }, [])

  // Check if today's challenge is completed
  const isTodayChallengeCompleted = useLiveQuery(
    async () => {
      const challenge = await getTodayChallenge()
      return !!challenge
    },
    [],
    false,
  )

  return {
    totalPoints,
    unlockedAchievements,
    newlyUnlockedAchievement,
    clearAchievementToast,
    addPoints,
    awardWordPoints,
    awardChapterPoints,
    awardDailyChallengePoints,
    checkAchievements,
    getStats,
    isTodayChallengeCompleted,
  }
}
