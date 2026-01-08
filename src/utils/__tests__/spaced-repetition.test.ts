import type { ISpacedRepetitionRecord } from '../db/spaced-repetition-record'
import { getUTCUnixTimestamp } from '../index'
import { calculateQuality, getNextReviewDate, updateSpacedRepetition } from '../spaced-repetition'
import { describe, expect, it } from 'vitest'

// Mock getUTCUnixTimestamp to return a fixed time if needed,
// or just rely on relative time logic for nextReviewDate.
// Since getNextReviewDate uses Date(), we might need to be loose on exact timestamp match or mock Date.
// For now, we test the logic of fields.

describe('SM-2 Algorithm', () => {
  it('should calculate quality correctly', () => {
    expect(calculateQuality(0)).toBe(5)
    expect(calculateQuality(1)).toBe(3)
    expect(calculateQuality(2)).toBe(2)
    expect(calculateQuality(3)).toBe(1)
    expect(calculateQuality(10)).toBe(0)
  })

  it('should update record correctly for first review (Correct)', () => {
    const initialRecord: ISpacedRepetitionRecord = {
      word: 'test',
      dict: 'test',
      easinessFactor: 2.5,
      interval: 0,
      repetitions: 0,
      nextReviewDate: 0,
      lastReviewDate: 0,
    }

    const updated = updateSpacedRepetition(initialRecord, 5)

    expect(updated.repetitions).toBe(1)
    expect(updated.interval).toBe(1)
    expect(updated.easinessFactor).toBeGreaterThan(2.5) // EF increases on perfection
  })

  it('should update record correctly for second review (Correct)', () => {
    const record: ISpacedRepetitionRecord = {
      word: 'test',
      dict: 'test',
      easinessFactor: 2.6,
      interval: 1,
      repetitions: 1,
      nextReviewDate: 0,
      lastReviewDate: 0,
    }
    const updated = updateSpacedRepetition(record, 5)
    expect(updated.repetitions).toBe(2)
    expect(updated.interval).toBe(6) // Fixed interval for 2nd repetition
  })

  it('should reset on failure', () => {
    const record: ISpacedRepetitionRecord = {
      word: 'test',
      dict: 'test',
      easinessFactor: 2.6,
      interval: 10,
      repetitions: 5,
      nextReviewDate: 0,
      lastReviewDate: 0,
    }
    const updated = updateSpacedRepetition(record, 2) // Quality < 3
    expect(updated.repetitions).toBe(0)
    expect(updated.interval).toBe(1)
    expect(updated.easinessFactor).toBeLessThan(2.6) // EF decreases on failure
    expect(updated.easinessFactor).toBeGreaterThanOrEqual(1.3) // Min cap
  })

  it('should calculate next review date in future', () => {
    const date = getNextReviewDate(1)
    const now = getUTCUnixTimestamp()
    expect(date).toBeGreaterThan(now)
    // Approx 1 day difference (86400s)
    expect(date - now).toBeGreaterThan(86000)
    expect(date - now).toBeLessThan(87000) // Allow some execution margin
  })
})
