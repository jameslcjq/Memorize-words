import type { ISpacedRepetitionRecord } from './db/spaced-repetition-record'
import { getUTCUnixTimestamp } from './index'

/**
 * SM-2 Algorithm Implementation
 *
 * EF (Easiness Factor): default 2.5, min 1.3
 * Interval: days
 * Repetitions: consecutive correct count
 */

export const MIN_EF = 1.3
export const DEFAULT_EF = 2.5

/**
 * Calculate quality score (0-5) based on user performance
 * 5 - Perfect response
 * 4 - Correct response after a hesitation
 * 3 - Correct response recalled with serious difficulty
 * 2 - Incorrect response; where the correct one seemed easy to recall
 * 1 - Incorrect response; the correct one remembered
 * 0 - Complete blackout
 *
 * In our typing context:
 * wrongCount = 0 -> 5 (or 4 if犹豫)
 * wrongCount = 1 -> 3
 * wrongCount > 1 -> 2/1/0
 */
export const calculateQuality = (wrongCount: number): number => {
  if (wrongCount === 0) return 5
  if (wrongCount === 1) return 3
  if (wrongCount === 2) return 2
  if (wrongCount === 3) return 1
  return 0
}

/**
 * Calculate next review schedule using SM-2 algorithm
 */
export const updateSpacedRepetition = (record: ISpacedRepetitionRecord, quality: number): ISpacedRepetitionRecord => {
  let { easinessFactor, repetitions, interval } = record

  // Calculate new EF
  // newEF = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easinessFactor = easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (easinessFactor < MIN_EF) easinessFactor = MIN_EF

  // Calculate new Interval & Repetitions
  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    repetitions += 1
    if (repetitions === 1) {
      interval = 1
    } else if (repetitions === 2) {
      interval = 6
    } else {
      interval = Math.round(interval * easinessFactor)
    }
  }

  return {
    ...record,
    easinessFactor,
    repetitions,
    interval,
    nextReviewDate: getNextReviewDate(interval),
    lastReviewDate: getUTCUnixTimestamp(),
  }
}

/**
 * Get Future Date Timestamp (UTC)
 * @param interval days
 */
export const getNextReviewDate = (interval: number): number => {
  const now = new Date()
  const nextDate = new Date(now)
  nextDate.setDate(now.getDate() + interval)

  // Normalize to UTC midnight to avoid timezone issues affecting daily buckets?
  // Or just simple timestamp addition.
  // Let's stick to simple timestamp logic consistent with existing getUTCUnixTimestamp use elsewhere if possible,
  // but usually we want "start of day" for "due today".
  // For now, let's just add days * 24h.
  // Actually, existing getUTCUnixTimestamp returns current seconds.

  // Let's use Date utilities to be safe.
  return Math.floor(
    Date.UTC(
      nextDate.getUTCFullYear(),
      nextDate.getUTCMonth(),
      nextDate.getUTCDate(),
      // Set to beginning of the day? Or keep current time?
      // Anki usually sets to early morning.
      // Let's just keep strict 24h intervals for simplicity or start of day?
      // "Next Review Date" usually implies "Available on this date".
      // Let's ensure it pushes to at least tomorrow if interval is 1.
      // We will store the timestamp.
      // If we use current time, verification might be tricky if we check "is due".
      // Let's stick to keeping time or setting to 00:00 UTC?
      // Let's keep existing time components for now to avoid "due in 23 hours" being "due tomorrow".
      nextDate.getUTCHours(),
      nextDate.getUTCMinutes(),
      nextDate.getUTCSeconds(),
    ) / 1000,
  )
}
