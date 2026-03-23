import { ITEM_MAP, RARITY_COLORS, RARITY_LABELS } from '@/constants/pet-items'
import { usePet } from '@/hooks/usePet'
import type { ItemDefinition, UserInventoryItem } from '@/typings/pet'
import { Dialog, Transition } from '@headlessui/react'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function InventoryPage() {
  const navigate = useNavigate()
  const { pet, inventory, feedPet, playWithPet, cleanPet, equipDecoration } = usePet()
  const [selectedItem, setSelectedItem] = useState<{ inv: UserInventoryItem; def: ItemDefinition } | null>(null)
  const [feedback, setFeedback] = useState<{ msg: string; success: boolean } | null>(null)

  const ownedItems = (inventory ?? []).filter((inv) => inv.quantity > 0)

  const handleUse = async (itemId: string, type: string) => {
    let rawResult: { success: boolean; message?: string }
    if (type === 'food') rawResult = await feedPet(itemId)
    else if (type === 'toy') rawResult = await playWithPet(itemId)
    else if (type === 'cleaning') rawResult = await cleanPet(itemId)
    else rawResult = await equipDecoration(itemId)
    const result = { success: rawResult.success, message: rawResult.message ?? (rawResult.success ? '操作成功' : '操作失败') }

    setSelectedItem(null)
    setFeedback({ msg: result.message || (result.success ? '使用成功！' : '使用失败'), success: result.success })
    setTimeout(() => setFeedback(null), 2500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
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
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">🎒 我的背包</h1>
          <span className="text-sm text-gray-400">{ownedItems.length} 种物品</span>
        </div>
      </div>

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

        {ownedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-6xl">🎒</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-200">背包是空的</h3>
            <p className="mb-6 text-sm text-gray-400 dark:text-gray-500">去商店购买物品，给宠物最好的照顾！</p>
            <button
              onClick={() => navigate('/pet/shop')}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white hover:bg-amber-600"
            >
              <ShoppingBag size={16} />
              去商店逛逛
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {ownedItems.map((inv) => {
              const item = ITEM_MAP.get(inv.itemId)
              if (!item) return null
              return (
                <button
                  key={inv.itemId}
                  onClick={() => setSelectedItem({ inv, def: item })}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 shadow-sm transition-all hover:shadow-md active:scale-95 dark:bg-gray-800"
                >
                  <div className="relative">
                    <span className="text-4xl">{item.icon}</span>
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                      {inv.quantity}
                    </span>
                  </div>
                  <span className="text-center text-xs font-medium text-gray-700 dark:text-gray-200">{item.name}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${RARITY_COLORS[item.rarity]}`}>{RARITY_LABELS[item.rarity]}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Item detail dialog */}
      <Transition appear show={!!selectedItem} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setSelectedItem(null)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>
          <div className="fixed inset-0 flex items-end justify-center sm:items-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-8"
              enterTo="opacity-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0"
              leaveTo="opacity-0 translate-y-8"
            >
              <Dialog.Panel className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl dark:bg-gray-800 sm:rounded-2xl">
                {selectedItem && (
                  <>
                    <div className="mb-4 flex items-center gap-4">
                      <span className="text-5xl">{selectedItem.def.icon}</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">{selectedItem.def.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs ${RARITY_COLORS[selectedItem.def.rarity]}`}>
                          {RARITY_LABELS[selectedItem.def.rarity]}
                        </span>
                      </div>
                    </div>
                    <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{selectedItem.def.description}</p>

                    {selectedItem.def.effect.stat !== 'decoration' && (
                      <div className="mb-4 rounded-xl bg-indigo-50 p-3 dark:bg-indigo-900/20">
                        <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                          使用效果：+{selectedItem.def.effect.value}{' '}
                          {selectedItem.def.effect.stat === 'hunger'
                            ? '饱食度'
                            : selectedItem.def.effect.stat === 'mood'
                            ? '心情'
                            : selectedItem.def.effect.stat === 'cleanliness'
                            ? '清洁度'
                            : '经验'}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => setSelectedItem(null)}
                        className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleUse(selectedItem.def.id, selectedItem.def.type)}
                        disabled={!pet}
                        className="flex-1 rounded-xl bg-indigo-500 py-2.5 text-sm font-bold text-white hover:bg-indigo-600 disabled:opacity-40"
                      >
                        {selectedItem.def.type === 'decoration' ? '装备' : '使用'}
                      </button>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
