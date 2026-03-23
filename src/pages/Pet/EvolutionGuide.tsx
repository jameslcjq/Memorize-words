import { usePet } from '@/hooks/usePet'
import type { PetStage } from '@/typings/pet'
import { getStageEmoji, getStageLabel } from '@/utils/pet-logic'
import { ArrowLeft, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STAGES: { stage: PetStage; levelRequired: number; abilities: string[] }[] = [
  {
    stage: 'egg',
    levelRequired: 0,
    abilities: ['🐾 宠物蛋阶段', '📖 等待孵化'],
  },
  {
    stage: 'baby',
    levelRequired: 1,
    abilities: ['🍞 接受喂食', '🧼 接受清洁', '💕 基础互动'],
  },
  {
    stage: 'youth',
    levelRequired: 5,
    abilities: ['🧶 玩玩具', '🎀 佩戴装饰', '✨ 增加经验值'],
  },
  {
    stage: 'adult',
    levelRequired: 15,
    abilities: ['👑 全部解锁', '🌟 特殊反应动画', '🏆 解锁成就称号'],
  },
]

export default function EvolutionGuidePage() {
  const navigate = useNavigate()
  const { pet } = usePet()

  const currentLevel = pet?.level ?? 0
  const currentStage = pet?.stage ?? null

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">宠物</span>
          </button>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">✨ 进化图鉴</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6">
        <p className="mb-6 text-center text-sm text-gray-400 dark:text-gray-500">通过背单词升级，解锁宠物的所有形态！</p>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 top-0 h-full w-0.5 bg-gray-200 dark:bg-gray-700" />

          <div className="space-y-6">
            {STAGES.map((s, index) => {
              const isUnlocked = currentLevel >= s.levelRequired
              const isCurrent = currentStage === s.stage
              const emoji = getStageEmoji(s.stage, 'cat', 'happy')

              return (
                <div key={s.stage} className="relative flex gap-4">
                  {/* Circle on timeline */}
                  <div
                    className={`relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-4 text-2xl ${
                      isCurrent
                        ? 'border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-200 dark:border-indigo-500 dark:bg-indigo-900/30 dark:shadow-indigo-900'
                        : isUnlocked
                        ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20'
                        : 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-800'
                    }`}
                  >
                    {isUnlocked ? (
                      <span className={isUnlocked ? '' : 'opacity-30'}>{emoji}</span>
                    ) : (
                      <Lock size={20} className="text-gray-300 dark:text-gray-600" />
                    )}
                  </div>

                  {/* Stage info */}
                  <div
                    className={`flex-1 rounded-xl p-4 shadow-sm ${
                      isCurrent
                        ? 'bg-indigo-50 ring-2 ring-indigo-300 dark:bg-indigo-900/20 dark:ring-indigo-600'
                        : isUnlocked
                        ? 'bg-white dark:bg-gray-800'
                        : 'bg-gray-50 opacity-60 dark:bg-gray-800/50'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="font-bold text-gray-800 dark:text-white">{getStageLabel(s.stage)}</h3>
                      <div className="flex items-center gap-2">
                        {isCurrent && <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-bold text-white">当前</span>}
                        {s.levelRequired > 0 && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              isUnlocked
                                ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-700'
                            }`}
                          >
                            Lv.{s.levelRequired}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress towards this stage */}
                    {!isUnlocked && index > 0 && (
                      <div className="mb-2">
                        <div className="mb-1 flex justify-between text-xs text-gray-400">
                          <span>距解锁</span>
                          <span>
                            Lv.{currentLevel} / {s.levelRequired}
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-indigo-300 transition-all"
                            style={{ width: `${Math.min(100, (currentLevel / s.levelRequired) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <ul className="space-y-0.5">
                      {s.abilities.map((ability) => (
                        <li key={ability} className="text-xs text-gray-500 dark:text-gray-400">
                          {ability}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-indigo-50 p-4 text-center dark:bg-indigo-900/20">
          <p className="text-sm text-indigo-600 dark:text-indigo-400">💡 每天背单词获得经验值，宠物会跟着你一起成长！</p>
        </div>
      </div>
    </div>
  )
}
