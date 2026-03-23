import AdoptionFlow from './components/AdoptionFlow'
import ItemPicker from './components/ItemPicker'
import PetDisplay from './components/PetDisplay'
import { useGamification } from '@/hooks/useGamification'
import { usePet } from '@/hooks/usePet'
import { calculateExpNeeded } from '@/utils/pet-logic'
import confetti from 'canvas-confetti'
import { ArrowLeft, ShoppingBag, Package, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function PetPage() {
  const navigate = useNavigate()
  const { pet, inventory, adoptPet, feedPet, playWithPet, cleanPet, equipDecoration } = usePet()
  const { totalPoints } = useGamification()

  const [activePicker, setActivePicker] = useState<'food' | 'toy' | 'cleaning' | 'decoration' | null>(null)
  const [feedback, setFeedback] = useState<{ msg: string; emoji: string } | null>(null)

  const showFeedback = (msg: string, emoji: string) => {
    setFeedback({ msg, emoji })
    setTimeout(() => setFeedback(null), 2500)
  }

  const handleAction = async (
    action: () => Promise<{ success: boolean; message: string; leveledUp?: boolean; evolved?: string | null }>,
  ) => {
    const result = await action()
    if (!result.success) {
      showFeedback(result.message, '❌')
      return
    }
    if (result.evolved) {
      showFeedback(`🎉 进化了！进入新形态！`, '🌟')
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ['#6366f1', '#8b5cf6', '#ec4899'] })
    } else if (result.leveledUp) {
      showFeedback('升级了！✨', '⬆️')
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } })
    } else {
      showFeedback('互动成功！', '💕')
    }
  }

  const expNeeded = pet ? calculateExpNeeded(pet.level) : 100
  const expPercent = pet ? Math.min(100, (pet.exp / expNeeded) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-900/80">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">返回</span>
          </button>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">我的宠物</h1>
          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 dark:bg-amber-900/30">
            <span className="text-sm">⭐</span>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{totalPoints ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-lg px-4 py-6">
        {!pet ? (
          <AdoptionFlow onAdopt={adoptPet} />
        ) : (
          <div className="space-y-6">
            {/* Feedback toast */}
            {feedback && (
              <div className="animate__animated animate__fadeInDown fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-2xl bg-white px-6 py-3 shadow-xl dark:bg-gray-700">
                <span className="text-2xl">{feedback.emoji}</span>
                <span className="ml-2 font-medium text-gray-800 dark:text-white">{feedback.msg}</span>
              </div>
            )}

            {/* Pet info card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">{pet.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Lv.{pet.level}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 dark:text-gray-500">经验值</p>
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {pet.exp} / {expNeeded}
                  </p>
                </div>
              </div>

              {/* Pet display */}
              <div className="flex justify-center py-4">
                <PetDisplay pet={pet} size="lg" />
              </div>

              {/* EXP bar */}
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-gray-400">
                  <span>经验值</span>
                  <span>距升级还差 {expNeeded - pet.exp} exp</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500"
                    style={{ width: `${expPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Attribute bars */}
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
              <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">属性状态</h3>
              <div className="space-y-3">
                <AttributeBar label="饱食度" icon="🍞" value={pet.hunger} color="from-amber-400 to-orange-400" />
                <AttributeBar label="心情" icon="😊" value={pet.mood} color="from-pink-400 to-rose-400" />
                <AttributeBar label="清洁度" icon="✨" value={pet.cleanliness} color="from-sky-400 to-blue-400" />
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800">
              <h3 className="mb-4 font-semibold text-gray-800 dark:text-white">互动</h3>
              <div className="grid grid-cols-4 gap-3">
                <ActionButton icon="🍞" label="喂食" onClick={() => setActivePicker('food')} />
                <ActionButton icon="🧶" label="玩耍" onClick={() => setActivePicker('toy')} />
                <ActionButton icon="🧼" label="清洁" onClick={() => setActivePicker('cleaning')} />
                <ActionButton icon="🎀" label="装扮" onClick={() => setActivePicker('decoration')} />
              </div>
            </div>

            {/* Bottom nav */}
            <div className="grid grid-cols-3 gap-3">
              <NavCard icon={<ShoppingBag size={20} />} label="商店" description="用积分购物" onClick={() => navigate('/pet/shop')} />
              <NavCard icon={<Package size={20} />} label="背包" description="查看物品" onClick={() => navigate('/pet/inventory')} />
              <NavCard
                icon={<Sparkles size={20} />}
                label="进化图鉴"
                description="查看成长路线"
                onClick={() => navigate('/pet/evolution')}
              />
            </div>
          </div>
        )}
      </div>

      {/* Item pickers */}
      {pet && inventory && (
        <>
          <ItemPicker
            isOpen={activePicker === 'food'}
            onClose={() => setActivePicker(null)}
            inventory={inventory}
            filterType="food"
            title="选择食物"
            onUse={async (itemId) => {
              const result = await feedPet(itemId)
              if (result.success) handleAction(async () => result)
              return { success: result.success, message: result.message ?? '' }
            }}
          />
          <ItemPicker
            isOpen={activePicker === 'toy'}
            onClose={() => setActivePicker(null)}
            inventory={inventory}
            filterType="toy"
            title="选择玩具"
            onUse={async (itemId) => {
              const result = await playWithPet(itemId)
              if (result.success) handleAction(async () => result)
              return { success: result.success, message: result.message ?? '' }
            }}
          />
          <ItemPicker
            isOpen={activePicker === 'cleaning'}
            onClose={() => setActivePicker(null)}
            inventory={inventory}
            filterType="cleaning"
            title="选择清洁用品"
            onUse={async (itemId) => {
              const result = await cleanPet(itemId)
              if (result.success) handleAction(async () => result)
              return { success: result.success, message: result.message ?? '' }
            }}
          />
          <ItemPicker
            isOpen={activePicker === 'decoration'}
            onClose={() => setActivePicker(null)}
            inventory={inventory}
            filterType="decoration"
            title="选择装饰品"
            onUse={async (itemId) => {
              const result = await equipDecoration(itemId)
              if (result.success) handleAction(async () => result)
              return { success: result.success, message: result.message ?? '' }
            }}
          />
        </>
      )}
    </div>
  )
}

function AttributeBar({ label, icon, value, color }: { label: string; icon: string; value: number; color: string }) {
  const colorClass = value <= 20 ? 'from-red-400 to-red-500' : value <= 40 ? 'from-yellow-400 to-amber-400' : color

  return (
    <div className="flex items-center gap-3">
      <span className="w-4 text-center text-base">{icon}</span>
      <span className="w-12 text-sm text-gray-600 dark:text-gray-300">{label}</span>
      <div className="flex flex-1 items-center gap-2">
        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-500`}
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="w-8 text-right text-xs text-gray-400 dark:text-gray-500">{value}</span>
      </div>
    </div>
  )
}

function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl border border-gray-100 bg-gray-50 p-3 transition-all hover:border-indigo-200 hover:bg-indigo-50 active:scale-95 dark:border-gray-700 dark:bg-gray-700/50 dark:hover:bg-indigo-900/20"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
    </button>
  )
}

function NavCard({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl bg-white p-4 shadow-sm transition-all hover:shadow-md active:scale-95 dark:bg-gray-800"
    >
      <div className="text-indigo-500 dark:text-indigo-400">{icon}</div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{label}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500">{description}</span>
    </button>
  )
}
