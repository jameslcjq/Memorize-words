import { getUTCUnixTimestamp } from '../index'

export interface ISpacedRepetitionRecord {
  id?: number
  word: string
  dict: string
  easinessFactor: number // 初始 2.5
  interval: number // 间隔天数
  repetitions: number // 连续正确次数
  nextReviewDate: number // 下次复习日期 (UTC timestamp)
  lastReviewDate: number // 上次复习日期
}

export class SpacedRepetitionRecord implements ISpacedRepetitionRecord {
  word: string
  dict: string
  easinessFactor: number
  interval: number
  repetitions: number
  nextReviewDate: number
  lastReviewDate: number

  constructor(word: string, dict: string, nextReviewDate: number, interval = 0, repetitions = 0, easinessFactor = 2.5) {
    this.word = word
    this.dict = dict
    this.easinessFactor = easinessFactor
    this.interval = interval
    this.repetitions = repetitions
    this.nextReviewDate = nextReviewDate
    this.lastReviewDate = getUTCUnixTimestamp()
  }
}
