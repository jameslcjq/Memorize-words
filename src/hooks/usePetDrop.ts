import { DROP_RULES } from '@/constants/pet-drop-rules'
import { ITEM_MAP } from '@/constants/pet-items'
import { hasPetAtom, petInventoryAtom, petLastSeenDropAtom, userInfoAtom } from '@/store'
import type { DropContext } from '@/typings/pet'
import { rollDrop } from '@/utils/pet-logic'
import { saveToCloud } from '@/utils/saveToCloud'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'

export function usePetDrop() {
  const hasPet = useAtomValue(hasPetAtom)
  const inventory = useAtomValue(petInventoryAtom)
  const userInfo = useAtomValue(userInfoAtom)

  const setPetInventory = useSetAtom(petInventoryAtom)
  const setLastDrop = useSetAtom(petLastSeenDropAtom)

  const tryDrop = useCallback(
    async (context: DropContext) => {
      if (!hasPet) return null

      const droppedItemId = rollDrop(DROP_RULES, context)
      if (!droppedItemId) return null

      const item = ITEM_MAP.get(droppedItemId)
      if (!item) return null

      const existing = inventory.find((i) => i.itemId === droppedItemId)
      const newInventory = existing
        ? inventory.map((i) => (i.itemId === droppedItemId ? { ...i, quantity: i.quantity + 1 } : i))
        : [...inventory, { itemId: droppedItemId, quantity: 1 }]

      setPetInventory(newInventory)
      setLastDrop({ itemId: droppedItemId, itemName: item.name, itemIcon: item.icon })

      if (userInfo) {
        await saveToCloud({ petInventory: newInventory })
      }

      return item
    },
    [hasPet, inventory, userInfo, setPetInventory, setLastDrop],
  )

  return { tryDrop }
}
