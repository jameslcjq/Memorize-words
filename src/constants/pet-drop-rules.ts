import type { DropRule } from '@/typings/pet'

export const DROP_RULES: DropRule[] = [
  // Perfect chapter complete: 20% chance of rare food
  {
    triggerType: 'perfect_score',
    chance: 0.2,
    possibleItems: ['food_cake', 'food_fish', 'toy_musicbox'],
    condition: (ctx) => ctx.isPerfect,
  },
  // Any chapter complete: 10% chance of common item
  {
    triggerType: 'chapter_complete',
    chance: 0.1,
    possibleItems: ['food_bread', 'food_apple', 'food_milk', 'toy_ball', 'toy_feather', 'clean_soap'],
  },
  // Review words complete: 25% chance of decoration or cleaning item
  {
    triggerType: 'review_complete',
    chance: 0.25,
    possibleItems: ['clean_brush', 'toy_feather', 'deco_ribbon'],
    condition: (ctx) => ctx.isReview,
  },
  // First daily goal: 15% chance of decoration
  {
    triggerType: 'daily_goal',
    chance: 0.15,
    possibleItems: ['deco_ribbon', 'deco_scarf', 'food_cake'],
    condition: (ctx) => ctx.isFirstDailyGoal,
  },
]
