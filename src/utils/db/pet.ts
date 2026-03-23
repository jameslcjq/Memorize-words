import type { DropLog, DropTriggerType, Pet, PetActionLog, PetActionType, UserInventoryItem } from '@/typings/pet'
import type { Table } from 'dexie'
import Dexie from 'dexie'

class PetDB extends Dexie {
  pets!: Table<Pet, number>
  userInventory!: Table<UserInventoryItem, number>
  petActionLog!: Table<PetActionLog, number>
  dropLog!: Table<DropLog, number>

  constructor() {
    super('PetDB')
    this.version(1).stores({
      pets: '++id,species,stage,level',
      userInventory: '++id,itemId',
      petActionLog: '++id,action,timestamp',
      dropLog: '++id,triggerType,timestamp',
    })
  }
}

export const petDb = new PetDB()

export async function getPet(): Promise<Pet | undefined> {
  return petDb.pets.toCollection().first()
}

export async function createPet(pet: Omit<Pet, 'id'>): Promise<number> {
  return petDb.pets.add(pet as Pet)
}

export async function updatePet(id: number, changes: Partial<Pet>): Promise<void> {
  await petDb.pets.update(id, changes)
}

export async function getInventory(): Promise<UserInventoryItem[]> {
  return petDb.userInventory.toArray()
}

export async function getInventoryItem(itemId: string): Promise<UserInventoryItem | undefined> {
  return petDb.userInventory.where('itemId').equals(itemId).first()
}

export async function addToInventory(itemId: string, quantity: number): Promise<void> {
  const existing = await getInventoryItem(itemId)
  if (existing && existing.id !== undefined) {
    await petDb.userInventory.update(existing.id, { quantity: existing.quantity + quantity })
  } else {
    await petDb.userInventory.add({ itemId, quantity })
  }
}

export async function removeFromInventory(itemId: string, quantity: number): Promise<boolean> {
  const existing = await getInventoryItem(itemId)
  if (!existing || existing.quantity < quantity) return false

  if (existing.id === undefined) return false

  if (existing.quantity === quantity) {
    await petDb.userInventory.delete(existing.id)
  } else {
    await petDb.userInventory.update(existing.id, { quantity: existing.quantity - quantity })
  }
  return true
}

export async function logAction(action: PetActionType, itemId?: string): Promise<void> {
  await petDb.petActionLog.add({ action, itemId, timestamp: Date.now() })
}

export async function logDrop(triggerType: DropTriggerType, itemId: string): Promise<void> {
  await petDb.dropLog.add({ triggerType, itemId, timestamp: Date.now() })
}

export async function getDropHistory(limit = 20): Promise<DropLog[]> {
  return petDb.dropLog.orderBy('timestamp').reverse().limit(limit).toArray()
}
