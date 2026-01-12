// Gamification Database Schema
import type { DailyChallengeRecord, PointsTransaction, UnlockedAchievement } from '@/typings/gamification'
import type { Table } from 'dexie'
import Dexie from 'dexie'

class GamificationDB extends Dexie {
  pointsTransactions!: Table<PointsTransaction, number>
  unlockedAchievements!: Table<UnlockedAchievement, string>
  dailyChallenges!: Table<DailyChallengeRecord, number>

  constructor() {
    super('GamificationDB')
    this.version(1).stores({
      pointsTransactions: '++id,reason,timestamp',
      unlockedAchievements: 'achievementId,unlockedAt',
      dailyChallenges: '++id,date,completedAt',
    })
    this.version(2).stores({
      pointsTransactions: '++id,reason,timestamp,[timestamp+reason]',
      unlockedAchievements: 'achievementId,unlockedAt',
      dailyChallenges: '++id,date,completedAt',
    })
  }
}

export const gamificationDb = new GamificationDB()

// Helper functions

/**
 * Get total points
 */
export async function getTotalPoints(): Promise<number> {
  const transactions = await gamificationDb.pointsTransactions.toArray()
  return transactions.reduce((sum, t) => sum + t.amount, 0)
}

/**
 * Add points
 */
export async function addPointsToDb(amount: number, reason: PointsTransaction['reason'], details?: string): Promise<void> {
  await gamificationDb.pointsTransactions.add({
    amount,
    reason,
    timestamp: Date.now(),
    details,
  })
}

/**
 * Get all unlocked achievements
 */
export async function getUnlockedAchievements(): Promise<UnlockedAchievement[]> {
  return gamificationDb.unlockedAchievements.toArray()
}

/**
 * Unlock an achievement
 */
export async function unlockAchievement(achievementId: string): Promise<boolean> {
  const existing = await gamificationDb.unlockedAchievements.get(achievementId)
  if (existing) return false // Already unlocked

  await gamificationDb.unlockedAchievements.add({
    achievementId,
    unlockedAt: Date.now(),
  })
  return true
}

/**
 * Check if achievement is unlocked
 */
export async function isAchievementUnlocked(achievementId: string): Promise<boolean> {
  const existing = await gamificationDb.unlockedAchievements.get(achievementId)
  return !!existing
}

/**
 * Get today's daily challenge record
 */
export async function getTodayChallenge(): Promise<DailyChallengeRecord | undefined> {
  const today = new Date().toISOString().split('T')[0]
  return gamificationDb.dailyChallenges.where('date').equals(today).first()
}

/**
 * Save daily challenge result
 */
export async function saveDailyChallengeResult(record: Omit<DailyChallengeRecord, 'id'>): Promise<void> {
  await gamificationDb.dailyChallenges.add(record as DailyChallengeRecord)
}

/**
 * Get daily challenge count
 */
export async function getDailyChallengeCount(): Promise<number> {
  return gamificationDb.dailyChallenges.count()
}

/**
 * Get points history (recent 50)
 */
export async function getPointsHistory(limit = 50): Promise<PointsTransaction[]> {
  return gamificationDb.pointsTransactions.orderBy('timestamp').reverse().limit(limit).toArray()
}
