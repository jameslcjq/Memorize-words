import { getUTCUnixTimestamp } from '../index'

export enum LearningStage {
  ENGLISH_TO_CHINESE = 'englishToChinese',
  CHINESE_TO_ENGLISH = 'chineseToEnglish',
  SPELLER = 'speller',
  TYPING = 'typing',
  COMPLETED = 'completed',
}

export interface WordProgress {
  word: string
  dict: string
  currentStage: LearningStage
  stagesCompleted: {
    englishToChinese: boolean
    chineseToEnglish: boolean
    speller: boolean
    typing: boolean
  }
  typingAttempts: number
  stageTimes: {
    englishToChinese?: number
    chineseToEnglish?: number
    speller?: number
    typing?: number
  }
  startTime: number
  downgrades: number
}

export interface SmartLearningSession {
  dict: string
  chapter: number
  currentGroup: number
  totalGroups: number
  words: WordProgress[]
  startTime: number
  totalTime: number
}

export interface SmartLearningRecord {
  id?: number
  dict: string
  chapter: number
  groupNumber: number
  wordsCount: number
  totalTime: number
  completedAt: number
  wordDetails: Array<{
    word: string
    stageTimes: {
      englishToChinese: number
      chineseToEnglish: number
      speller: number
      typing: number
    }
    typingAttempts: number
    downgrades: number
  }>
}

export class WordProgressRecord implements WordProgress {
  word: string
  dict: string
  currentStage: LearningStage
  stagesCompleted: {
    englishToChinese: boolean
    chineseToEnglish: boolean
    speller: boolean
    typing: boolean
  }
  typingAttempts: number
  stageTimes: {
    englishToChinese?: number
    chineseToEnglish?: number
    speller?: number
    typing?: number
  }
  startTime: number
  downgrades: number

  constructor(word: string, dict: string) {
    this.word = word
    this.dict = dict
    this.currentStage = Math.random() > 0.5 ? LearningStage.ENGLISH_TO_CHINESE : LearningStage.CHINESE_TO_ENGLISH
    this.stagesCompleted = {
      englishToChinese: false,
      chineseToEnglish: false,
      speller: false,
      typing: false,
    }
    this.typingAttempts = 0
    this.stageTimes = {}
    this.startTime = getUTCUnixTimestamp()
    this.downgrades = 0
  }
}
