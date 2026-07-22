import { detectMorph, detectPhonics, detectWordFamily } from './morph-rules'
import type { Word } from '@/typings'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('morph and phonics rules', () => {
  it('recognizes common phonics, families and affixes', () => {
    expect(detectPhonics('book')).toContain('oo')
    expect(detectWordFamily('make')).toBe('-ake')
    expect(detectMorph('teacher')?.suffix).toEqual({ text: 'er', meaning: '做…的人或物' })
    expect(detectMorph('teacher')?.root).toEqual({ text: 'teach', meaning: '教' })
  })

  it('keeps the primary elementary dictionaries fully annotated and phonetic', () => {
    for (const file of ['yilin_3a.json', 'yilin_3b.json', 'yilin_4a.json']) {
      const words = JSON.parse(readFileSync(path.resolve('public', file), 'utf8')) as Word[]
      expect(words.length).toBeGreaterThan(0)
      expect(words.every((word) => Boolean(word.phonics?.length || word.wordFamily))).toBe(true)
      expect(words.every((word) => Boolean(word.usphone && word.ukphone))).toBe(true)
    }
  })
})
