import { PET_ITEM_CATALOG } from '@/constants/pet-items'
import { petInventoryAtom, pointsTransactionsAtom, totalPointsAtom, userInfoAtom } from '@/store'
import type { PointsTransaction } from '@/typings/gamification'
import { saveToCloud } from '@/utils/saveToCloud'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'

export function usePetShop() {
  const userInfo = useAtomValue(userInfoAtom)
  const totalPoints = useAtomValue(totalPointsAtom)
  const inventory = useAtomValue(petInventoryAtom)

  const setPointsTransactions = useSetAtom(pointsTransactionsAtom)
  const setPetInventory = useSetAtom(petInventoryAtom)

  const buyItem = useCallback(
    async (itemId: string, quantity = 1): Promise<{ success: boolean; message: string }> => {
      const item = PET_ITEM_CATALOG.find((i) => i.id === itemId)
      if (!item) return { success: false, message: '物品不存在' }

      const cost = item.price * quantity
      if (totalPoints < cost) {
        return { success: false, message: `积分不足，需要 ${cost} 积分，当前 ${totalPoints} 积分` }
      }

      // Compute new state before updating atoms
      const newTx: PointsTransaction = {
        amount: -cost,
        reason: 'pet_shop_purchase',
        timestamp: Date.now(),
        details: `购买 ${item.name} x${quantity}`,
      }
      const existing = inventory.find((i) => i.itemId === itemId)
      const newInventory = existing
        ? inventory.map((i) => (i.itemId === itemId ? { ...i, quantity: i.quantity + quantity } : i))
        : [...inventory, { itemId, quantity }]

      // Update atoms
      setPointsTransactions((prev) => [...prev, newTx])
      setPetInventory(newInventory)

      // Persist to cloud
      if (userInfo) {
        await saveToCloud(userInfo.userId, {
          pointsTransactions: [newTx],
          petInventory: newInventory,
        })
      }

      return { success: true, message: `成功购买 ${item.name}` }
    },
    [totalPoints, inventory, userInfo, setPointsTransactions, setPetInventory],
  )

  return {
    items: PET_ITEM_CATALOG,
    inventory,
    totalPoints,
    buyItem,
  }
}
