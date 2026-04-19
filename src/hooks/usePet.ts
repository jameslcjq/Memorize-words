import { ITEM_MAP } from '@/constants/pet-items'
import { hasPetAtom, petAtom, petInventoryAtom, userInfoAtom } from '@/store'
import type { Pet, PetSpecies, UserInventoryItem } from '@/typings/pet'
import { addExpToPet, applyDecayToPet, applyItemEffect } from '@/utils/pet-logic'
import { saveToCloud } from '@/utils/saveToCloud'
import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useMemo } from 'react'

export function usePet() {
  const userInfo = useAtomValue(userInfoAtom)
  const petRaw = useAtomValue(petAtom)
  const inventory = useAtomValue(petInventoryAtom)

  const setPet = useSetAtom(petAtom)
  const setPetInventory = useSetAtom(petInventoryAtom)
  const setHasPet = useSetAtom(hasPetAtom)

  // Apply decay on read (no DB write needed - lastInteractedAt only changes on interactions)
  const pet = useMemo(() => {
    if (!petRaw) return null
    return applyDecayToPet(petRaw, Date.now())
  }, [petRaw])

  const adoptPet = useCallback(
    async (name: string, species: PetSpecies) => {
      const now = Date.now()
      const newPet: Pet = {
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
      }
      setPet(newPet)
      setPetInventory([])
      setHasPet(true)
      if (userInfo) {
        await saveToCloud({ pet: newPet, petInventory: [] })
      }
    },
    [setPet, setPetInventory, setHasPet, userInfo],
  )

  const feedPet = useCallback(
    async (itemId: string) => {
      if (!petRaw) return { success: false, message: '没有宠物' }

      const item = ITEM_MAP.get(itemId)
      if (!item || item.type !== 'food') return { success: false, message: '无效物品' }

      const invItem = inventory.find((i) => i.itemId === itemId)
      if (!invItem || invItem.quantity < 1) return { success: false, message: '背包中没有该物品' }

      const decayed = applyDecayToPet(petRaw, Date.now())
      const updated = applyItemEffect(decayed, item)
      const { pet: withExp, leveledUp, evolved } = addExpToPet(updated, 3)

      const newPet: Pet = {
        ...petRaw,
        hunger: withExp.hunger,
        mood: withExp.mood,
        cleanliness: withExp.cleanliness,
        exp: withExp.exp,
        level: withExp.level,
        stage: withExp.stage,
        lastInteractedAt: Date.now(),
      }
      const newInventory = removeOne(inventory, itemId)

      setPet(newPet)
      setPetInventory(newInventory)
      if (userInfo) {
        await saveToCloud({ pet: newPet, petInventory: newInventory })
      }

      return { success: true, message: '喂食成功！', leveledUp, evolved }
    },
    [petRaw, inventory, userInfo, setPet, setPetInventory],
  )

  const playWithPet = useCallback(
    async (itemId: string) => {
      if (!petRaw) return { success: false, message: '没有宠物' }

      const item = ITEM_MAP.get(itemId)
      if (!item || item.type !== 'toy') return { success: false, message: '无效物品' }

      const invItem = inventory.find((i) => i.itemId === itemId)
      if (!invItem || invItem.quantity < 1) return { success: false, message: '背包中没有该物品' }

      const decayed = applyDecayToPet(petRaw, Date.now())
      const updated = applyItemEffect(decayed, item)
      const { pet: withExp, leveledUp, evolved } = addExpToPet(updated, 5)

      const newPet: Pet = {
        ...petRaw,
        mood: withExp.mood,
        hunger: withExp.hunger,
        cleanliness: withExp.cleanliness,
        exp: withExp.exp,
        level: withExp.level,
        stage: withExp.stage,
        lastInteractedAt: Date.now(),
      }
      const newInventory = removeOne(inventory, itemId)

      setPet(newPet)
      setPetInventory(newInventory)
      if (userInfo) {
        await saveToCloud({ pet: newPet, petInventory: newInventory })
      }

      return { success: true, message: '玩耍成功！', leveledUp, evolved }
    },
    [petRaw, inventory, userInfo, setPet, setPetInventory],
  )

  const cleanPet = useCallback(
    async (itemId: string) => {
      if (!petRaw) return { success: false, message: '没有宠物' }

      const item = ITEM_MAP.get(itemId)
      if (!item || item.type !== 'cleaning') return { success: false, message: '无效物品' }

      const invItem = inventory.find((i) => i.itemId === itemId)
      if (!invItem || invItem.quantity < 1) return { success: false, message: '背包中没有该物品' }

      const decayed = applyDecayToPet(petRaw, Date.now())
      const updated = applyItemEffect(decayed, item)

      const newPet: Pet = {
        ...petRaw,
        cleanliness: updated.cleanliness,
        hunger: updated.hunger,
        mood: updated.mood,
        lastInteractedAt: Date.now(),
      }
      const newInventory = removeOne(inventory, itemId)

      setPet(newPet)
      setPetInventory(newInventory)
      if (userInfo) {
        await saveToCloud({ pet: newPet, petInventory: newInventory })
      }

      return { success: true, message: '清洁成功！', leveledUp: false, evolved: null }
    },
    [petRaw, inventory, userInfo, setPet, setPetInventory],
  )

  const equipDecoration = useCallback(
    async (itemId: string) => {
      if (!petRaw) return { success: false, message: '没有宠物' }

      const item = ITEM_MAP.get(itemId)
      if (!item || item.type !== 'decoration') return { success: false, message: '无效物品' }

      const invItem = inventory.find((i) => i.itemId === itemId)
      if (!invItem || invItem.quantity < 1) return { success: false, message: '背包中没有该物品' }

      const currentOutfit: string[] = JSON.parse(petRaw.outfitJson || '[]')
      if (!currentOutfit.includes(itemId)) currentOutfit.push(itemId)

      const newPet: Pet = {
        ...petRaw,
        outfitJson: JSON.stringify(currentOutfit),
        lastInteractedAt: Date.now(),
      }
      const newInventory = removeOne(inventory, itemId)

      setPet(newPet)
      setPetInventory(newInventory)
      if (userInfo) {
        await saveToCloud({ pet: newPet, petInventory: newInventory })
      }

      return { success: true, message: '装备成功！', leveledUp: false, evolved: null }
    },
    [petRaw, inventory, userInfo, setPet, setPetInventory],
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

// Helper: remove 1 quantity of an item from inventory array
function removeOne(inventory: UserInventoryItem[], itemId: string): UserInventoryItem[] {
  return inventory.map((i) => (i.itemId === itemId ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0)
}
