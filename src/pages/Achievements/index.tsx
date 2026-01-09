// Achievements Page - Display all achievements
import { useGamification } from '@/hooks/useGamification'
import { ACHIEVEMENTS } from '@/typings/gamification'
import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Achievements() {
  const navigate = useNavigate()
  const { unlockedAchievements, totalPoints } = useGamification()

  const unlockedIds = useMemo(() => new Set(unlockedAchievements.map((a) => a.achievementId)), [unlockedAchievements])

  const unlockedCount = unlockedAchievements.length
  const totalCount = ACHIEVEMENTS.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>返回</span>
          </button>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">🏆 成就系统</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span>
              {unlockedCount}/{totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">累计积分</p>
              <p className="text-4xl font-bold">{totalPoints.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">已解锁成就</p>
              <p className="text-4xl font-bold">
                {unlockedCount}
                <span className="text-lg opacity-60">/{totalCount}</span>
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {ACHIEVEMENTS.map((achievement) => {
            const isUnlocked = unlockedIds.has(achievement.id)
            return (
              <div
                key={achievement.id}
                className={`rounded-xl p-4 transition-all ${
                  isUnlocked ? 'bg-white shadow-lg dark:bg-gray-800' : 'bg-gray-100 opacity-60 grayscale dark:bg-gray-800/50'
                }`}
              >
                <div className="mb-2 text-4xl">{achievement.icon}</div>
                <h3 className={`font-bold ${isUnlocked ? 'text-gray-800 dark:text-white' : 'text-gray-400'}`}>{achievement.name}</h3>
                <p className={`mt-1 text-sm ${isUnlocked ? 'text-gray-500 dark:text-gray-400' : 'text-gray-400'}`}>
                  {achievement.description}
                </p>
                {isUnlocked ? (
                  <p className="mt-2 text-xs font-medium text-green-500">✓ 已解锁</p>
                ) : (
                  <p className="mt-2 text-xs text-amber-500">+{achievement.points} 积分</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
