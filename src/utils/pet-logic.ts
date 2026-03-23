import type { DropContext, DropRule, ItemDefinition, Pet, PetStage, PetVisualState } from '@/typings/pet'

const HOURS_MS = 1000 * 60 * 60

export function calculateDecay(pet: Pet, now: number): { hunger: number; mood: number; cleanliness: number } {
  const elapsed = now - pet.lastInteractedAt
  const hours = elapsed / HOURS_MS

  const hunger = Math.max(0, pet.hunger - Math.floor(hours * 3))
  const mood = Math.max(0, pet.mood - Math.floor(hours * 2))
  const cleanliness = Math.max(0, pet.cleanliness - Math.floor(hours * 1))

  return { hunger, mood, cleanliness }
}

export function applyDecayToPet(pet: Pet, now: number): Pet {
  const { hunger, mood, cleanliness } = calculateDecay(pet, now)
  return { ...pet, hunger, mood, cleanliness }
}

export function applyItemEffect(pet: Pet, item: ItemDefinition): Pet {
  const effect = item.effect
  if (effect.stat === 'decoration') return pet

  const updated = { ...pet }

  if (effect.stat === 'hunger') {
    updated.hunger = Math.min(100, pet.hunger + effect.value)
  } else if (effect.stat === 'mood') {
    updated.mood = Math.min(100, pet.mood + effect.value)
  } else if (effect.stat === 'cleanliness') {
    updated.cleanliness = Math.min(100, pet.cleanliness + effect.value)
  } else if (effect.stat === 'exp') {
    updated.exp = pet.exp + effect.value
  }

  return updated
}

export function calculateExpNeeded(level: number): number {
  return 50 + level * 20
}

export function checkEvolution(pet: Pet): PetStage | null {
  if (pet.stage === 'egg' && pet.level >= 1) return 'baby'
  if (pet.stage === 'baby' && pet.level >= 5) return 'youth'
  if (pet.stage === 'youth' && pet.level >= 15) return 'adult'
  return null
}

export function addExpToPet(pet: Pet, expAmount: number): { pet: Pet; leveledUp: boolean; evolved: PetStage | null } {
  let newExp = pet.exp + expAmount
  let newLevel = pet.level
  let leveledUp = false

  while (newExp >= calculateExpNeeded(newLevel)) {
    newExp -= calculateExpNeeded(newLevel)
    newLevel++
    leveledUp = true
  }

  const updatedPet = { ...pet, exp: newExp, level: newLevel }
  const evolved = checkEvolution(updatedPet)

  return {
    pet: evolved ? { ...updatedPet, stage: evolved } : updatedPet,
    leveledUp,
    evolved,
  }
}

export function getPetVisualState(pet: Pet): PetVisualState {
  if (pet.hunger <= 20) return 'hungry'
  if (pet.cleanliness <= 20) return 'dirty'
  if (pet.mood <= 20) return 'sad'
  if (pet.mood >= 70 && pet.hunger >= 60) return 'happy'
  return 'neutral'
}

export function rollDrop(rules: DropRule[], context: DropContext): string | null {
  for (const rule of rules) {
    if (rule.condition && !rule.condition(context)) continue
    if (Math.random() < rule.chance) {
      const items = rule.possibleItems
      return items[Math.floor(Math.random() * items.length)]
    }
  }
  return null
}

export function getStageLabel(stage: PetStage): string {
  const labels: Record<PetStage, string> = {
    egg: '宠物蛋',
    baby: '幼年期',
    youth: '成长期',
    adult: '成熟期',
  }
  return labels[stage]
}

export function getStageEmoji(stage: PetStage, species: string, visualState: PetVisualState): string {
  if (species === 'cat') {
    if (stage === 'egg') return '🥚'
    if (stage === 'baby') {
      if (visualState === 'happy') return '😸'
      if (visualState === 'sad') return '😿'
      if (visualState === 'hungry') return '🙀'
      return '😺'
    }
    if (stage === 'youth') {
      if (visualState === 'happy') return '😸'
      if (visualState === 'sad') return '😿'
      if (visualState === 'hungry') return '🙀'
      return '🐱'
    }
    if (stage === 'adult') {
      if (visualState === 'happy') return '😻'
      if (visualState === 'sad') return '😾'
      if (visualState === 'hungry') return '🙀'
      return '🐈'
    }
  }
  return '🐾'
}
