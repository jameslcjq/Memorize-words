import { getUTCUnixTimestamp } from '@/utils'
import { db } from '@/utils/db'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'

export function useSpacedRepetition() {
  const getTodayReviewWords = useCallback(async (dictId: string) => {
    const now = getUTCUnixTimestamp()
    return await db.spacedRepetitionRecords
      .where('dict')
      .equals(dictId)
      .filter((record) => record.nextReviewDate <= now)
      .toArray()
  }, [])

  const getReviewCount = useCallback(async (dictId: string) => {
    const now = getUTCUnixTimestamp()
    return await db.spacedRepetitionRecords
      .where('dict')
      .equals(dictId)
      .filter((record) => record.nextReviewDate <= now)
      .count()
  }, [])

  const useReviewCount = (dictId: string) => {
    return useLiveQuery(() => getReviewCount(dictId), [dictId, getReviewCount], 0)
  }

  return { getTodayReviewWords, getReviewCount, useReviewCount }
}
