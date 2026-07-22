import { getSmartLearningInitializationKey } from './smartLearningInitialization'
import { describe, expect, it } from 'vitest'

describe('smart learning initialization key', () => {
  it('does not change when the same dictionary and chapter receive a new word-array reference', () => {
    const firstWords = [{ name: 'book' }]
    const refreshedWords = [...firstWords]
    const firstKey = getSmartLearningInitializationKey('Yilin3A', 0, firstWords.length)
    const refreshedKey = getSmartLearningInitializationKey('Yilin3A', 0, refreshedWords.length)
    expect(refreshedKey).toBe(firstKey)
  })

  it('changes when the dictionary or chapter changes and waits for words', () => {
    expect(getSmartLearningInitializationKey('Yilin3A', 0, 0)).toBeNull()
    expect(getSmartLearningInitializationKey('Yilin3A', 1, 20)).not.toBe(getSmartLearningInitializationKey('Yilin3A', 0, 20))
  })
})
