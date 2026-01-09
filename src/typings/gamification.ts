// Gamification Type Definitions

/**
 * Achievement definition
 */
export interface Achievement {
  id: string
  name: string
  icon: string
  description: string
  points: number // Points awarded when unlocked
  condition: AchievementCondition
}

export type AchievementCondition =
  | { type: 'words_completed'; count: number }
  | { type: 'streak_days'; count: number }
  | { type: 'perfect_chapter' }
  | { type: 'error_book_cleared'; count: number }
  | { type: 'daily_challenges'; count: number }
  | { type: 'points_earned'; count: number }
  | { type: 'all_modes_tried' }
  | { type: 'daily_challenge_score'; minScore: number }
  | { type: 'all_achievements' }

/**
 * User's unlocked achievement record
 */
export interface UnlockedAchievement {
  achievementId: string
  unlockedAt: number // timestamp
}

/**
 * Points transaction record
 */
export interface PointsTransaction {
  id?: number
  amount: number
  reason: PointsReason
  timestamp: number
  details?: string
}

export type PointsReason = 'word_correct' | 'combo_bonus' | 'chapter_complete' | 'daily_challenge' | 'achievement_unlock'

/**
 * Daily challenge record
 */
export interface DailyChallengeRecord {
  id?: number
  date: string // YYYY-MM-DD format
  score: number
  wordsCompleted: number
  wordsTotal: number
  timeSpent: number // seconds
  completedAt: number // timestamp
}

/**
 * User gamification stats
 */
export interface GamificationStats {
  totalPoints: number
  totalWordsCompleted: number
  currentStreak: number
  longestStreak: number
  dailyChallengesCompleted: number
  modesTriedSet: Set<string>
  perfectChapters: number
  errorBookCleared: number
}

/**
 * All achievements definition
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_word',
    name: '初次尝试',
    icon: '🌱',
    description: '完成第1个单词',
    points: 100,
    condition: { type: 'words_completed', count: 1 },
  },
  {
    id: 'words_100',
    name: '学习新手',
    icon: '📚',
    description: '累计完成100个单词',
    points: 100,
    condition: { type: 'words_completed', count: 100 },
  },
  {
    id: 'words_500',
    name: '学霸养成',
    icon: '🎓',
    description: '累计完成500个单词',
    points: 100,
    condition: { type: 'words_completed', count: 500 },
  },
  {
    id: 'words_1000',
    name: '单词大师',
    icon: '👑',
    description: '累计完成1000个单词',
    points: 100,
    condition: { type: 'words_completed', count: 1000 },
  },
  {
    id: 'streak_3',
    name: '连续3天',
    icon: '🔥',
    description: '连续学习3天',
    points: 100,
    condition: { type: 'streak_days', count: 3 },
  },
  {
    id: 'streak_7',
    name: '连续7天',
    icon: '⚡',
    description: '连续学习7天',
    points: 100,
    condition: { type: 'streak_days', count: 7 },
  },
  {
    id: 'streak_30',
    name: '连续30天',
    icon: '💪',
    description: '连续学习30天',
    points: 100,
    condition: { type: 'streak_days', count: 30 },
  },
  {
    id: 'perfect_chapter',
    name: '完美章节',
    icon: '✨',
    description: '一章全对无错误',
    points: 100,
    condition: { type: 'perfect_chapter' },
  },
  {
    id: 'error_killer',
    name: '错题克星',
    icon: '🎯',
    description: '从错题本移出10个单词',
    points: 100,
    condition: { type: 'error_book_cleared', count: 10 },
  },
  {
    id: 'challenge_master',
    name: '挑战达人',
    icon: '🏆',
    description: '完成10次每日挑战',
    points: 100,
    condition: { type: 'daily_challenges', count: 10 },
  },
  {
    id: 'points_1000',
    name: '积分达人',
    icon: '💯',
    description: '累计获得1000积分',
    points: 100,
    condition: { type: 'points_earned', count: 1000 },
  },
  {
    id: 'points_5000',
    name: '积分富翁',
    icon: '🌟',
    description: '累计获得5000积分',
    points: 100,
    condition: { type: 'points_earned', count: 5000 },
  },
  {
    id: 'all_modes',
    name: '全能学霸',
    icon: '🧠',
    description: '尝试所有练习模式',
    points: 100,
    condition: { type: 'all_modes_tried' },
  },
  {
    id: 'speed_star',
    name: '速度之星',
    icon: '⏱️',
    description: '每日挑战获得80+分',
    points: 100,
    condition: { type: 'daily_challenge_score', minScore: 80 },
  },
  {
    id: 'legendary',
    name: '传奇玩家',
    icon: '🎖️',
    description: '解锁所有其他成就',
    points: 100,
    condition: { type: 'all_achievements' },
  },
]

/**
 * All exercise modes for tracking
 */
export const ALL_EXERCISE_MODES = ['typing', 'word-to-trans', 'trans-to-word', 'speller', 'dictation', 'crossword', 'daily-challenge']
