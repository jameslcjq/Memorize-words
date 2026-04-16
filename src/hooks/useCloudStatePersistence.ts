import {
  cloudLoadedAtom,
  dailyChallengesAtom,
  hasPetAtom,
  petAtom,
  petInventoryAtom,
  pointsTransactionsAtom,
  unlockedAchievementsAtom,
  userInfoAtom,
} from '@/store'
import type { DailyChallengeRecord, PointsTransaction, UnlockedAchievement } from '@/typings/gamification'
import type { Pet, UserInventoryItem } from '@/typings/pet'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'

const STORAGE_PREFIX = 'cloud-state:v1:'

type PersistedCloudState = {
  version: 1
  pointsTransactions: PointsTransaction[]
  unlockedAchievements: UnlockedAchievement[]
  dailyChallenges: DailyChallengeRecord[]
  pet: Pet | null
  petInventory: UserInventoryItem[]
  hasPet: boolean
}

const EMPTY_STATE: PersistedCloudState = {
  version: 1,
  pointsTransactions: [],
  unlockedAchievements: [],
  dailyChallenges: [],
  pet: null,
  petInventory: [],
  hasPet: false,
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getStorageKey(userId?: string): string {
  return `${STORAGE_PREFIX}${userId || 'guest'}`
}

function readPersistedState(storageKey: string): PersistedCloudState {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return EMPTY_STATE

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedCloudState>
    const pet = isObject(parsed.pet) ? (parsed.pet as Pet) : null

    return {
      version: 1,
      pointsTransactions: Array.isArray(parsed.pointsTransactions) ? parsed.pointsTransactions : [],
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements) ? parsed.unlockedAchievements : [],
      dailyChallenges: Array.isArray(parsed.dailyChallenges) ? parsed.dailyChallenges : [],
      pet,
      petInventory: Array.isArray(parsed.petInventory) ? parsed.petInventory : [],
      hasPet: typeof parsed.hasPet === 'boolean' ? parsed.hasPet : !!pet,
    }
  } catch {
    localStorage.removeItem(storageKey)
    return EMPTY_STATE
  }
}

export function useCloudStatePersistence() {
  const userInfo = useAtomValue(userInfoAtom)
  const storageKey = useMemo(() => getStorageKey(userInfo?.userId), [userInfo?.userId])

  const [pointsTransactions, setPointsTransactions] = useAtom(pointsTransactionsAtom)
  const [unlockedAchievements, setUnlockedAchievements] = useAtom(unlockedAchievementsAtom)
  const [dailyChallenges, setDailyChallenges] = useAtom(dailyChallengesAtom)
  const [pet, setPet] = useAtom(petAtom)
  const [petInventory, setPetInventory] = useAtom(petInventoryAtom)
  const [hasPet, setHasPet] = useAtom(hasPetAtom)
  const setCloudLoaded = useSetAtom(cloudLoadedAtom)

  const isRestoringRef = useRef(true)

  useLayoutEffect(() => {
    isRestoringRef.current = true

    const persisted = readPersistedState(storageKey)

    setPointsTransactions(persisted.pointsTransactions)
    setUnlockedAchievements(persisted.unlockedAchievements)
    setDailyChallenges(persisted.dailyChallenges)
    setPet(persisted.pet)
    setPetInventory(persisted.petInventory)
    setHasPet(persisted.hasPet || !!persisted.pet)
    setCloudLoaded(false)
  }, [storageKey, setCloudLoaded, setDailyChallenges, setHasPet, setPet, setPetInventory, setPointsTransactions, setUnlockedAchievements])

  useEffect(() => {
    if (isRestoringRef.current) {
      isRestoringRef.current = false
      return
    }

    const snapshot: PersistedCloudState = {
      version: 1,
      pointsTransactions,
      unlockedAchievements,
      dailyChallenges,
      pet,
      petInventory,
      hasPet: hasPet || !!pet,
    }

    localStorage.setItem(storageKey, JSON.stringify(snapshot))
  }, [storageKey, pointsTransactions, unlockedAchievements, dailyChallenges, pet, petInventory, hasPet])
}
