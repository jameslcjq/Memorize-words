// Achievement Toast Component - Shows when achievement is unlocked
import type { Achievement } from '@/typings/gamification'
import { useEffect, useState } from 'react'

interface AchievementToastProps {
  achievement: Achievement | null
  onClose: () => void
}

export default function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (achievement) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 300) // Wait for fade out animation
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [achievement, onClose])

  if (!achievement) return null

  return (
    <div
      className={`fixed left-1/2 top-20 z-50 -translate-x-1/2 transform transition-all duration-300 ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 shadow-2xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-4xl">{achievement.icon}</div>
        <div className="text-white">
          <p className="text-sm font-medium opacity-80">🎉 成就解锁！</p>
          <p className="text-xl font-bold">{achievement.name}</p>
          <p className="text-sm opacity-80">{achievement.description}</p>
          <p className="mt-1 text-xs font-medium text-amber-300">+{achievement.points} 积分</p>
        </div>
      </div>
    </div>
  )
}
