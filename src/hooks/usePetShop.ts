import { PET_ITEM_CATALOG } from '@/constants/pet-items'
import { useGamification } from '@/hooks/useGamification'
import { addPointsToDb } from '@/utils/db/gamification'
import { addToInventory, getInventory } from '@/utils/db/pet'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'

export function usePetShop() {
  const { totalPoints } = useGamification()
  const inventory = useLiveQuery(() => getInventory(), [], [])

  const buyItem = useCallback(
    async (itemId: string, quantity = 1): Promise<{ success: boolean; message: string }> => {
      const item = PET_ITEM_CATALOG.find((i) => i.id === itemId)
      if (!item) return { success: false, message: '物品不存在' }

      const cost = item.price * quantity
      const currentPoints = totalPoints ?? 0

      if (currentPoints < cost) {
        return { success: false, message: `积分不足，需要 ${cost} 积分，当前 ${currentPoints} 积分` }
      }

      await addPointsToDb(-cost, 'pet_shop_purchase', `购买 ${item.name} x${quantity}`)
      await addToInventory(itemId, quantity)

      return { success: true, message: `成功购买 ${item.name}` }
    },
    [totalPoints],
  )

  return {
    items: PET_ITEM_CATALOG,
    inventory,
    totalPoints: totalPoints ?? 0,
    buyItem,
  }
}
