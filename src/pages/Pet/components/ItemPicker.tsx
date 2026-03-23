import { ITEM_MAP } from '@/constants/pet-items'
import type { ItemType, UserInventoryItem } from '@/typings/pet'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { Fragment } from 'react'

interface ItemPickerProps {
  isOpen: boolean
  onClose: () => void
  inventory: UserInventoryItem[]
  filterType: ItemType
  onUse: (itemId: string) => Promise<{ success: boolean; message: string }>
  title: string
}

export default function ItemPicker({ isOpen, onClose, inventory, filterType, onUse, title }: ItemPickerProps) {
  const filteredItems = inventory.filter((inv) => {
    const item = ITEM_MAP.get(inv.itemId)
    return item && item.type === filterType && inv.quantity > 0
  })

  const handleUse = async (itemId: string) => {
    const result = await onUse(itemId)
    if (result.success) {
      onClose()
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
            <Dialog.Panel className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl dark:bg-gray-800 sm:rounded-2xl">
              <div className="mb-4 flex items-center justify-between">
                <Dialog.Title className="text-lg font-bold text-gray-800 dark:text-white">{title}</Dialog.Title>
                <button
                  onClick={onClose}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                >
                  <X size={20} />
                </button>
              </div>

              {filteredItems.length === 0 ? (
                <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                  <div className="mb-2 text-4xl">🛒</div>
                  <p>背包里没有可用的物品</p>
                  <a href="/pet/shop" className="mt-2 block text-sm text-indigo-500 hover:underline">
                    去商店购买
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {filteredItems.map((inv) => {
                    const item = ITEM_MAP.get(inv.itemId)
                    if (!item) return null
                    return (
                      <button
                        key={inv.itemId}
                        onClick={() => handleUse(inv.itemId)}
                        className="flex flex-col items-center gap-1 rounded-xl border-2 border-gray-100 bg-gray-50 p-3 transition-all hover:border-indigo-300 hover:bg-indigo-50 active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-indigo-500 dark:hover:bg-indigo-900/20"
                      >
                        <span className="text-3xl">{item.icon}</span>
                        <span className="text-center text-xs font-medium text-gray-700 dark:text-gray-200">{item.name}</span>
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                          x{inv.quantity}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
