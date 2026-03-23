// Pet Cultivation Module - Type Definitions

export type PetStage = 'egg' | 'baby' | 'youth' | 'adult'
export type PetSpecies = 'cat'

export interface Pet {
  id?: number
  species: PetSpecies
  name: string
  level: number
  exp: number
  stage: PetStage
  mood: number // 0-100
  hunger: number // 0-100
  cleanliness: number // 0-100
  outfitJson: string // JSON array of equipped decoration IDs
  lastInteractedAt: number // timestamp, for decay calculation
  createdAt: number
}

export type ItemType = 'food' | 'toy' | 'cleaning' | 'decoration'
export type ItemRarity = 'common' | 'rare' | 'epic'

export type ItemEffect =
  | { stat: 'hunger'; value: number }
  | { stat: 'mood'; value: number }
  | { stat: 'cleanliness'; value: number }
  | { stat: 'exp'; value: number }
  | { stat: 'decoration'; decorationId: string }

export interface ItemDefinition {
  id: string
  name: string
  icon: string // emoji
  type: ItemType
  effect: ItemEffect
  price: number
  rarity: ItemRarity
  unlockLevel: number
  description: string
}

export interface UserInventoryItem {
  id?: number
  itemId: string
  quantity: number
}

export type PetActionType = 'feed' | 'play' | 'clean' | 'equip' | 'evolve' | 'adopt'

export interface PetActionLog {
  id?: number
  action: PetActionType
  itemId?: string
  timestamp: number
}

export type DropTriggerType = 'chapter_complete' | 'perfect_score' | 'review_complete' | 'daily_goal'

export interface DropLog {
  id?: number
  triggerType: DropTriggerType
  itemId: string
  timestamp: number
}

export interface DropContext {
  isPerfect: boolean
  comboStreak: number
  isFirstDailyGoal: boolean
  isReview: boolean
}

export interface DropRule {
  triggerType: DropTriggerType
  chance: number // 0-1
  possibleItems: string[] // item IDs
  condition?: (context: DropContext) => boolean
}

export type PetVisualState = 'happy' | 'neutral' | 'sad' | 'hungry' | 'dirty'
