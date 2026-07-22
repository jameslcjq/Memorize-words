import { calculateDecay, resolvePetSync } from '../pet-logic'
import type { Pet } from '@/typings/pet'
import { describe, expect, it } from 'vitest'

const HOUR = 1000 * 60 * 60

function makePet(overrides: Partial<Pet> = {}): Pet {
  const now = 0
  return {
    species: 'cat',
    name: '测试宠物',
    level: 1,
    exp: 0,
    stage: 'baby',
    mood: 80,
    hunger: 80,
    cleanliness: 80,
    outfitJson: '[]',
    lastInteractedAt: now,
    createdAt: now,
    ...overrides,
  }
}

describe('calculateDecay', () => {
  it('decays normally over a short absence', () => {
    const pet = makePet({ mood: 80, hunger: 80, cleanliness: 80, lastInteractedAt: 0 })
    // 5 小时后: hunger -15, mood -10, cleanliness -5
    const decayed = calculateDecay(pet, 5 * HOUR)
    expect(decayed.hunger).toBe(65)
    expect(decayed.mood).toBe(70)
    expect(decayed.cleanliness).toBe(75)
  })

  it('never drops below the offline decay floor (30) after a long absence', () => {
    const pet = makePet({ mood: 80, hunger: 80, cleanliness: 80, lastInteractedAt: 0 })
    // 一周后如无下限本会归零；应被下限拦在 30。
    const decayed = calculateDecay(pet, 24 * 7 * HOUR)
    expect(decayed.hunger).toBe(30)
    expect(decayed.mood).toBe(30)
    expect(decayed.cleanliness).toBe(30)
  })

  it('does not raise a stat that is already below the floor', () => {
    const pet = makePet({ hunger: 20, mood: 25, cleanliness: 10, lastInteractedAt: 0 })
    const decayed = calculateDecay(pet, 24 * 7 * HOUR)
    // 已低于下限的属性不会被"衰减"抬高，保持原值。
    expect(decayed.hunger).toBe(20)
    expect(decayed.mood).toBe(25)
    expect(decayed.cleanliness).toBe(10)
  })
})

describe('resolvePetSync', () => {
  it('keeps the local pet when the cloud has none (regression: pet loss)', () => {
    const local = makePet({ name: '本地', createdAt: 1000, lastInteractedAt: 2000 })
    const { nextPet, localPetWins } = resolvePetSync(local, null)
    expect(nextPet).toBe(local)
    expect(localPetWins).toBe(true)
  })

  it('restores the cloud pet when there is no local pet', () => {
    const cloud = makePet({ name: '云端', createdAt: 1000, lastInteractedAt: 2000 })
    const { nextPet, localPetWins } = resolvePetSync(null, cloud)
    expect(nextPet).toBe(cloud)
    expect(localPetWins).toBe(false)
  })

  it('prefers the local pet when it was interacted with more recently', () => {
    const local = makePet({ name: '本地', color: 'sky', lastInteractedAt: 5000 })
    const cloud = makePet({ name: '云端', lastInteractedAt: 3000 })
    expect(resolvePetSync(local, cloud).nextPet).toBe(local)
    expect(resolvePetSync(local, cloud).nextPet?.color).toBe('sky')
  })

  it('prefers the cloud pet when it is newer', () => {
    const local = makePet({ name: '本地', lastInteractedAt: 3000 })
    const cloud = makePet({ name: '云端', lastInteractedAt: 5000 })
    const { nextPet, localPetWins } = resolvePetSync(local, cloud)
    expect(nextPet).toBe(cloud)
    expect(localPetWins).toBe(false)
  })

  it('returns null only when neither side has a pet', () => {
    expect(resolvePetSync(null, null).nextPet).toBeNull()
  })
})
