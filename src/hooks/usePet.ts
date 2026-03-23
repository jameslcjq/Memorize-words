import { ITEM_MAP } from '@/constants/pet-items'
import { hasPetAtom } from '@/store'
import type { Pet, PetSpecies } from '@/typings/pet'
import { addToInventory, createPet, getInventory, getPet, logAction, removeFromInventory, updatePet } from '@/utils/db/pet'
import { addExpToPet, applyDecayToPet, applyItemEffect, checkEvolution } from '@/utils/pet-logic'
import { useLiveQuery } from 'dexie-react-hooks'
import { useSetAtom } from 'jotai'
import { useCallback, useMemo } from 'react'

export function usePet() {
  const setHasPet = useSetAtom(hasPetAtom)

  const petRaw = useLiveQuery(() => getPet())
  const inventory = useLiveQuery(() => getInventory(), [], [])

  // Apply decay on read
  const pet = useMemo(() => {
    if (!petRaw) return null
    return applyDecayToPet(petRaw, Date.now())
  }, [petRaw])

  const adoptPet = useCallback(
    async (name: string, species: PetSpecies) => {
      const now = Date.now()
      await createPet({
        species,
        name,
        level: 1,
        exp: 0,
        stage: 'baby',
        mood: 80,
        hunger: 80,
        cleanliness: 80,
        outfitJson: '[]',
        lastInteractedAt: now,
        createdAt: now,
      })
      await logAction('adopt')
      setHasPet(true)
    },
    [setHasPet],
  )

  const feedPet = useCallback(
    async (itemId: string) => {
      if (!petRaw?.id) return { success: false, message: '没有宠物' }

      const item = ITEM_MAP.get(itemId)
      if (!item || item.type !== 'food') return { success: false, message: '无效物品' }

      const removed = await removeFromInventory(itemId, 1)
      if (!removed) return { success: false, message: '背包中没有该物品' }

      const decayed = applyDecayToPet(petRaw, Date.now())
      const updated = applyItemEffect(decayed, item)
      // Give 3 exp for feeding
      const { pet: withExp, leveledUp, evolved } = addExpToPet(updated, 3)

      await updatePet(petRaw.id, {
        hunger: withExp.hunger,
        mood: withExp.mood,
        cleanliness: withExp.cleanliness,
        exp: withExp.exp,
        level: withExp.level,
        stage: withExp.stage,
        lastInteractedAt: Date.now(),
      })
      await logAction('feed', itemId)

      return { success: true, message: '喂食成功！', leveledUp, evolved }
    },
    [petRaw],
  )

  const playWithPet = useCallback(
    async (itemId: string) => {
      if (!petRaw?.id) return { success: false, message: '没有宠物' }

      const item = ITEM_MAP.get(itemId)
      if (!item || item.type !== 'toy') return { success: false, message: '无效物品' }

      const removed = await removeFromInventory(itemId, 1)
      if (!removed) return { success: false, message: '背包中没有该物品' }

      const decayed = applyDecayToPet(petRaw, Date.now())
      const updated = applyItemEffect(decayed, item)
      // Give 5 exp for playing
      const { pet: withExp, leveledUp, evolved } = addExpToPet(updated, 5)

      await updatePet(petRaw.id, {
        mood: withExp.mood,
        hunger: withExp.hunger,
        cleanliness: withExp.cleanliness,
        exp: withExp.exp,
        level: withExp.level,
        stage: withExp.stage,
        lastInteractedAt: Date.now(),
      })
      await logAction('play', itemId)

      return { success: true, message: '玩耍成功！', leveledUp, evolved }
    },
    [petRaw],
  )

  const cleanPet = useCallback(
    async (itemId: string) => {
      if (!petRaw?.id) return { success: false, message: '没有宠物' }

      const item = ITEM_MAP.get(itemId)
      if (!item || item.type !== 'cleaning') return { success: false, message: '无效物品' }

      const removed = await removeFromInventory(itemId, 1)
      if (!removed) return { success: false, message: '背包中没有该物品' }

      const decayed = applyDecayToPet(petRaw, Date.now())
      const updated = applyItemEffect(decayed, item)

      await updatePet(petRaw.id, {
        cleanliness: updated.cleanliness,
        hunger: updated.hunger,
        mood: updated.mood,
        lastInteractedAt: Date.now(),
      })
      await logAction('clean', itemId)

      return { success: true, message: '清洁成功！', leveledUp: false, evolved: null }
    },
    [petRaw],
  )

  const equipDecoration = useCallback(
    async (itemId: string) => {
      if (!petRaw?.id) return { success: false, message: '没有宠物' }

      const item = ITEM_MAP.get(itemId)
      if (!item || item.type !== 'decoration') return { success: false, message: '无效物品' }

      const removed = await removeFromInventory(itemId, 1)
      if (!removed) return { success: false, message: '背包中没有该物品' }

      const currentOutfit: string[] = JSON.parse(petRaw.outfitJson || '[]')
      if (!currentOutfit.includes(itemId)) {
        currentOutfit.push(itemId)
      }

      await updatePet(petRaw.id, {
        outfitJson: JSON.stringify(currentOutfit),
        lastInteractedAt: Date.now(),
      })
      await logAction('equip', itemId)

      return { success: true, message: '装备成功！', leveledUp: false, evolved: null }
    },
    [petRaw],
  )

  return {
    pet,
    petRaw,
    inventory,
    adoptPet,
    feedPet,
    playWithPet,
    cleanPet,
    equipDecoration,
  }
}
