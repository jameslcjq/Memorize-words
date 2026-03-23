import type { Pet } from '@/typings/pet'
import { getStageEmoji, getStageLabel, getPetVisualState } from '@/utils/pet-logic'
import 'animate.css'

interface PetDisplayProps {
  pet: Pet
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
}

export default function PetDisplay({ pet, size = 'lg', showStatus = true }: PetDisplayProps) {
  const visualState = getPetVisualState(pet)
  const emoji = getStageEmoji(pet.stage, pet.species, visualState)

  const sizeClasses = {
    sm: 'text-6xl',
    md: 'text-8xl',
    lg: 'text-9xl',
  }

  const animationClass =
    visualState === 'happy'
      ? 'animate__animated animate__pulse animate__infinite'
      : visualState === 'sad' || visualState === 'hungry'
      ? 'animate__animated animate__headShake animate__infinite'
      : 'animate__animated animate__pulse animate__infinite animate__slow'

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Pet emoji with animation */}
      <div
        className={`${sizeClasses[size]} ${animationClass} select-none`}
        style={{ animationDuration: visualState === 'happy' ? '2s' : '3s' }}
      >
        {emoji}
      </div>

      {/* Stage label */}
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          {getStageLabel(pet.stage)}
        </span>
        {/* Equipped decorations */}
        {pet.outfitJson && JSON.parse(pet.outfitJson).length > 0 && (
          <span className="text-sm" title="已装备装饰品">
            {JSON.parse(pet.outfitJson)
              .slice(0, 3)
              .map((id: string) => {
                const deco: Record<string, string> = { deco_ribbon: '🎀', deco_hat: '🎩', deco_scarf: '🧣' }
                return deco[id] || ''
              })
              .join('')}
          </span>
        )}
      </div>

      {/* Status indicators */}
      {showStatus && (
        <div className="flex gap-2 text-sm">
          {pet.hunger <= 20 && <span className="animate-bounce text-amber-500">😰 饿了</span>}
          {pet.cleanliness <= 20 && <span className="text-gray-500">💩 脏了</span>}
          {pet.mood <= 20 && <span className="text-blue-400">😢 难过</span>}
          {visualState === 'happy' && <span className="text-pink-400">✨ 开心</span>}
        </div>
      )}
    </div>
  )
}
