import type { PetSpecies } from '@/typings/pet'
import confetti from 'canvas-confetti'
import { useState } from 'react'

interface AdoptionFlowProps {
  onAdopt: (name: string, species: PetSpecies) => Promise<void>
}

export default function AdoptionFlow({ onAdopt }: AdoptionFlowProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAdopt = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      await onAdopt(name.trim(), 'cat')
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-4">
      {/* Title */}
      <div className="text-center">
        <div className="mb-4 text-7xl">🥚</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">领养你的第一只宠物！</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">坚持背单词，一起养大它！</p>
      </div>

      {/* Instructions */}
      <div className="w-full max-w-sm rounded-xl bg-indigo-50 p-4 dark:bg-indigo-900/20">
        <h3 className="mb-2 font-semibold text-indigo-700 dark:text-indigo-300">📖 如何养成宠物？</h3>
        <ul className="space-y-1 text-sm text-indigo-600 dark:text-indigo-400">
          <li>✅ 背单词赚积分</li>
          <li>🛒 用积分在商店购买食物、玩具</li>
          <li>🍞 喂食和互动让宠物成长</li>
          <li>⬆️ 升级解锁新形态和装饰</li>
        </ul>
      </div>

      {/* Name input */}
      <div className="w-full max-w-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">给你的小猫起个名字</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdopt()}
          placeholder="例如：小橘、咪咪、奶牛..."
          maxLength={10}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-indigo-700"
        />
        <p className="mt-1 text-right text-xs text-gray-400">{name.length}/10</p>
      </div>

      {/* Species selection (cat only for MVP) */}
      <div className="w-full max-w-sm">
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">选择物种</label>
        <div className="grid grid-cols-3 gap-3">
          <button className="flex flex-col items-center gap-1 rounded-xl border-2 border-indigo-400 bg-indigo-50 p-3 dark:bg-indigo-900/30">
            <span className="text-3xl">🐱</span>
            <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">猫咪</span>
          </button>
          <button
            disabled
            className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-gray-200 p-3 opacity-40 dark:border-gray-600"
          >
            <span className="text-3xl">🐶</span>
            <span className="text-xs text-gray-400">即将开放</span>
          </button>
          <button
            disabled
            className="flex flex-col items-center gap-1 rounded-xl border-2 border-dashed border-gray-200 p-3 opacity-40 dark:border-gray-600"
          >
            <span className="text-3xl">🐰</span>
            <span className="text-xs text-gray-400">即将开放</span>
          </button>
        </div>
      </div>

      {/* Adopt button */}
      <button
        onClick={handleAdopt}
        disabled={!name.trim() || loading}
        className="w-full max-w-sm rounded-xl bg-indigo-500 py-4 text-lg font-bold text-white transition-all hover:bg-indigo-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? '领养中...' : '🎉 领养这只猫咪！'}
      </button>
    </div>
  )
}
