import { RARITY_COLORS, RARITY_LABELS } from '@/constants/pet-items'
import { usePet } from '@/hooks/usePet'
import { usePetShop } from '@/hooks/usePetShop'
import type { ItemType } from '@/typings/pet'
import { Tab } from '@headlessui/react'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TABS: { label: string; type: ItemType | 'all' }[] = [
  { label: '全部', type: 'all' },
  { label: '食物', type: 'food' },
  { label: '玩具', type: 'toy' },
  { label: '清洁', type: 'cleaning' },
  { label: '装饰', type: 'decoration' },
]

export default function ShopPage() {
  const navigate = useNavigate()
  const { items, totalPoints, buyItem } = usePetShop()
  const { pet } = usePet()
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null)
  const [buying, setBuying] = useState<string | null>(null)

  const handleBuy = async (itemId: string) => {
    setBuying(itemId)
    const result = await buyItem(itemId, 1)
    setBuying(null)
    setFeedback({ msg: result.message, success: result.success })
    setTimeout(() => setFeedback(null), 2500)
  }

  const petLevel = pet?.level ?? 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">🛒 宠物商店</h1>
          <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 dark:bg-amber-900/30">
            <span className="text-sm">⭐</span>
            <span className="text-sm font-bold text-amber-700 dark:text-amber-400">{totalPoints}</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* Feedback */}
        {feedback && (
          <div
            className={`animate__animated animate__fadeInDown mb-4 rounded-xl px-4 py-3 text-sm font-medium ${
              feedback.success
                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {feedback.success ? '✅' : '❌'} {feedback.msg}
          </div>
        )}

        {/* Points card */}
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">当前积分</p>
              <p className="text-3xl font-bold">{totalPoints}</p>
            </div>
            <ShoppingCart size={40} className="opacity-30" />
          </div>
          <p className="mt-1 text-xs opacity-70">背单词赚积分 · 积分养宠物</p>
        </div>

        {/* Tabs */}
        <Tab.Group>
          <Tab.List className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {TABS.map((tab) => (
              <Tab key={tab.type} as={Fragment}>
                {({ selected }) => (
                  <button
                    className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      selected
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-white text-gray-500 hover:bg-amber-50 hover:text-amber-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                )}
              </Tab>
            ))}
          </Tab.List>

          <Tab.Panels>
            {TABS.map((tab) => {
              const filtered = tab.type === 'all' ? items : items.filter((i) => i.type === tab.type)
              return (
                <Tab.Panel key={tab.type}>
                  <div className="grid grid-cols-2 gap-3">
                    {filtered.map((item) => {
                      const isLocked = item.unlockLevel > petLevel
                      const canAfford = totalPoints >= item.price

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl bg-white p-4 shadow-sm transition-all dark:bg-gray-800 ${isLocked ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-3xl">{item.icon}</span>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RARITY_COLORS[item.rarity]}`}>
                              {RARITY_LABELS[item.rarity]}
                            </span>
                          </div>
                          <h3 className="mt-2 font-semibold text-gray-800 dark:text-white">{item.name}</h3>
                          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{item.description}</p>

                          {/* Effect */}
                          {item.effect.stat !== 'decoration' && (
                            <p className="mt-1 text-xs text-indigo-500 dark:text-indigo-400">
                              +{item.effect.value}{' '}
                              {item.effect.stat === 'hunger'
                                ? '饱食度'
                                : item.effect.stat === 'mood'
                                ? '心情'
                                : item.effect.stat === 'cleanliness'
                                ? '清洁度'
                                : '经验'}
                            </p>
                          )}

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <span className="text-sm">⭐</span>
                              <span className={`text-sm font-bold ${canAfford ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                                {item.price}
                              </span>
                            </div>
                            {isLocked ? (
                              <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-400 dark:bg-gray-700">
                                Lv.{item.unlockLevel} 解锁
                              </span>
                            ) : (
                              <button
                                onClick={() => handleBuy(item.id)}
                                disabled={!canAfford || buying === item.id}
                                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-amber-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {buying === item.id ? '...' : '购买'}
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Tab.Panel>
              )
            })}
          </Tab.Panels>
        </Tab.Group>

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500">💡 背单词赚积分，每完成一章可获得 30-80 积分</p>
      </div>
    </div>
  )
}
