import { DROP_RULES } from '@/constants/pet-drop-rules'
import { ITEM_MAP } from '@/constants/pet-items'
import { hasPetAtom, petLastSeenDropAtom } from '@/store'
import type { DropContext } from '@/typings/pet'
import { addToInventory, logDrop } from '@/utils/db/pet'
import { rollDrop } from '@/utils/pet-logic'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'

export function usePetDrop() {
  const hasPet = useAtomValue(hasPetAtom)
  const setLastDrop = useSetAtom(petLastSeenDropAtom)

  const tryDrop = useCallback(
    async (context: DropContext) => {
      if (!hasPet) return null

      // Try perfect score drop first, then chapter complete
      const triggerType = context.isReview
        ? 'review_complete'
        : context.isFirstDailyGoal
        ? 'daily_goal'
        : context.isPerfect
        ? 'perfect_score'
        : 'chapter_complete'

      const droppedItemId = rollDrop(DROP_RULES, context)
      if (!droppedItemId) return null

      const item = ITEM_MAP.get(droppedItemId)
      if (!item) return null

      await addToInventory(droppedItemId, 1)
      await logDrop(triggerType, droppedItemId)
      setLastDrop({ itemId: droppedItemId, itemName: item.name, itemIcon: item.icon })

      return item
    },
    [hasPet, setLastDrop],
  )

  return { tryDrop }
}
