import { getUTCUnixTimestamp } from '../index'
import { calculateQuality, updateSpacedRepetition } from '../spaced-repetition'
import { scheduleErrorBookSync } from './cloud-sync'
import type { IDeletedWordRecord } from './deleted-word-record'
import { DeletedWordRecord } from './deleted-word-record'
import type { IChapterRecord, IReviewRecord, IRevisionDictRecord, IWordRecord, LetterMistakes } from './record'
import { ChapterRecord, ReviewRecord, WordRecord } from './record'
import type { SmartLearningRecord } from './smart-learning-record'
import type { ISpacedRepetitionRecord } from './spaced-repetition-record'
import { SpacedRepetitionRecord } from './spaced-repetition-record'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import type { TypingState } from '@/pages/Typing/store/type'
import { currentChapterAtom, currentDictIdAtom, exerciseModeAtom, isReviewModeAtom } from '@/store'
import type { Table } from 'dexie'
import Dexie from 'dexie'
import { useAtomValue } from 'jotai'
import { useCallback, useContext } from 'react'

class RecordDB extends Dexie {
  wordRecords!: Table<IWordRecord, number>
  chapterRecords!: Table<IChapterRecord, number>
  reviewRecords!: Table<IReviewRecord, number>
  spacedRepetitionRecords!: Table<ISpacedRepetitionRecord, number>
  smartLearningRecords!: Table<SmartLearningRecord, number>
  deletedWordRecords!: Table<IDeletedWordRecord, number>

  revisionDictRecords!: Table<IRevisionDictRecord, number>
  revisionWordRecords!: Table<IWordRecord, number>

  constructor() {
    super('RecordDB')
    this.version(1).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,errorCount,[dict+chapter]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,[dict+chapter]',
    })
    this.version(2).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,[dict+chapter]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,[dict+chapter]',
    })
    this.version(3).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,[dict+chapter]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,[dict+chapter]',
      reviewRecords: '++id,dict,createTime,isFinished',
    })
    this.version(4).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,correctCount,[word+dict]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,[dict+chapter]',
      reviewRecords: '++id,dict,createTime,isFinished',
    })
    this.version(5).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,correctCount,mode,[word+dict]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,[dict+chapter]',
      reviewRecords: '++id,dict,createTime,isFinished',
    })
    this.version(6).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,correctCount,mode,[word+dict]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,mode,[dict+chapter]',
      reviewRecords: '++id,dict,createTime,isFinished',
    })
    this.version(7).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,correctCount,mode,[word+dict]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,mode,[dict+chapter]',
      reviewRecords: '++id,dict,createTime,isFinished',
      spacedRepetitionRecords: '++id,word,dict,nextReviewDate,[dict+word]',
    })
    this.version(8).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,correctCount,mode,[word+dict]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,mode,[dict+chapter],[dict+chapter+timeStamp]',
      reviewRecords: '++id,dict,createTime,isFinished,[dict+createTime]',
      spacedRepetitionRecords: '++id,word,dict,nextReviewDate,[word+dict]',
    })
    this.version(9).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,correctCount,mode,[word+dict]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,mode,[dict+chapter],[dict+chapter+timeStamp]',
      reviewRecords: '++id,dict,createTime,isFinished,[dict+createTime]',
      spacedRepetitionRecords: '++id,word,dict,nextReviewDate,[word+dict]',
      smartLearningRecords: '++id,dict,chapter,completedAt',
    })
    this.version(10).stores({
      wordRecords: '++id,word,timeStamp,dict,chapter,wrongCount,correctCount,mode,[word+dict]',
      chapterRecords: '++id,timeStamp,dict,chapter,time,mode,[dict+chapter],[dict+chapter+timeStamp]',
      reviewRecords: '++id,dict,createTime,isFinished,[dict+createTime]',
      spacedRepetitionRecords: '++id,word,dict,nextReviewDate,[word+dict]',
      smartLearningRecords: '++id,dict,chapter,completedAt',
      deletedWordRecords: '++id,word,dict,deletedAt,[dict+word]',
    })
  }
}

export const db = new RecordDB()

db.wordRecords.mapToClass(WordRecord)
db.chapterRecords.mapToClass(ChapterRecord)
db.reviewRecords.mapToClass(ReviewRecord)
db.spacedRepetitionRecords.mapToClass(SpacedRepetitionRecord)
db.deletedWordRecords.mapToClass(DeletedWordRecord)

async function markWordRecordDeleted(word: string, dict: string, deletedAt = getUTCUnixTimestamp()) {
  const existing = await db.deletedWordRecords.where('[dict+word]').equals([dict, word]).first()

  if (existing?.id !== undefined) {
    if (deletedAt > existing.deletedAt) {
      await db.deletedWordRecords.update(existing.id, { deletedAt })
    }
    return
  }

  await db.deletedWordRecords.add(new DeletedWordRecord(word, dict, deletedAt))
}

export function useSaveChapterRecord() {
  const currentChapter = useAtomValue(currentChapterAtom)
  const isRevision = useAtomValue(isReviewModeAtom)
  const dictID = useAtomValue(currentDictIdAtom)
  const exerciseMode = useAtomValue(exerciseModeAtom)

  const saveChapterRecord = useCallback(
    (typingState: TypingState) => {
      const {
        chapterData: { correctCount, wrongCount, userInputLogs, wordCount, words, wordRecordIds },
        timerData: { time },
      } = typingState
      const correctWordIndexes = userInputLogs.filter((log) => log.correctCount > 0 && log.wrongCount === 0).map((log) => log.index)

      const chapterRecord = new ChapterRecord(
        dictID,
        isRevision ? -1 : currentChapter,
        time,
        correctCount,
        wrongCount,
        wordCount,
        correctWordIndexes,
        words.length,
        wordRecordIds ?? [],
        exerciseMode,
      )
      db.chapterRecords.add(chapterRecord)
    },
    [currentChapter, dictID, isRevision, exerciseMode],
  )

  return saveChapterRecord
}

export type WordKeyLogger = {
  letterTimeArray: number[]
  letterMistake: LetterMistakes
}

export function useSaveWordRecord() {
  const isRevision = useAtomValue(isReviewModeAtom)
  const currentChapter = useAtomValue(currentChapterAtom)
  const dictID = useAtomValue(currentDictIdAtom)
  const exerciseMode = useAtomValue(exerciseModeAtom)

  const { dispatch } = useContext(TypingContext) ?? {}

  const saveWordRecord = useCallback(
    async ({
      word,
      wrongCount,
      letterTimeArray,
      letterMistake,
    }: {
      word: string
      wrongCount: number
      letterTimeArray: number[]
      letterMistake: LetterMistakes
    }) => {
      const timing = []
      for (let i = 1; i < letterTimeArray.length; i++) {
        const diff = letterTimeArray[i] - letterTimeArray[i - 1]
        timing.push(diff)
      }

      // 查找是否已存在错题记录（用于错题本练习）
      const existingRecord = await db.wordRecords.where({ word, dict: dictID }).first()
      if (existingRecord && existingRecord.wrongCount > 0) {
        // 这是一个错题本中的单词
        if (wrongCount === 0) {
          // 本次完全正确（没有打错任何字母），累加 correctCount
          const newCorrectCount = (existingRecord.correctCount || 0) + 1
          if (existingRecord.id !== undefined) {
            if (newCorrectCount >= 3) {
              const recordId = existingRecord.id
              // 正确 3 次，删除记录（移出错题本）
              await db.transaction('rw', db.wordRecords, db.deletedWordRecords, async () => {
                await db.wordRecords.delete(recordId)
                await markWordRecordDeleted(word, dictID)
              })
            } else {
              // 更新正确次数
              await db.wordRecords.update(existingRecord.id, { correctCount: newCorrectCount })
            }
          }
        } else {
          // 本次有打错，重置 correctCount 为 0，同时更新 wrongCount
          if (existingRecord.id !== undefined) {
            await db.wordRecords.update(existingRecord.id, {
              correctCount: 0,
              wrongCount: existingRecord.wrongCount + wrongCount,
            })
          }
        }
        if (dispatch) {
          dispatch({ type: TypingStateActionType.SET_IS_SAVING_RECORD, payload: false })
        }
        // Schedule cloud sync after error book update
        scheduleErrorBookSync()
        return
      }

      // 如果是错误输入，或者没有已存在的错题记录（正常练习中），则新增记录
      const wordRecord = new WordRecord(word, dictID, isRevision ? -1 : currentChapter, timing, wrongCount, letterMistake, 0, exerciseMode)

      let dbID = -1
      try {
        dbID = await db.wordRecords.add(wordRecord)
      } catch (e) {
        console.error(e)
      }
      if (dispatch) {
        dbID > 0 && dispatch({ type: TypingStateActionType.ADD_WORD_RECORD_ID, payload: dbID })
        dispatch({ type: TypingStateActionType.SET_IS_SAVING_RECORD, payload: false })
      }

      // Schedule cloud sync after new word record
      if (wrongCount > 0) {
        scheduleErrorBookSync()
      }

      // --- Spaced Repetition Logic ---
      try {
        // Find existing Spaced Repetition record
        let srRecord = await db.spacedRepetitionRecords.where({ word, dict: dictID }).first()

        // If not exists, create initial
        if (!srRecord) {
          srRecord = new SpacedRepetitionRecord(word, dictID, getUTCUnixTimestamp())
          // We don't save it yet, we update it first
        }

        // Calculate Quality
        const quality = calculateQuality(wrongCount)

        // Update with SM-2
        const updatedRecord = updateSpacedRepetition(srRecord, quality)

        // Save back to DB
        // If it was new, id is undefined, put() will add it.
        // If it existing, id is present, put() will update it.
        await db.spacedRepetitionRecords.put(updatedRecord)
      } catch (e) {
        console.error('Error updating Spaced Repetition record:', e)
      }
      // -------------------------------
    },
    [currentChapter, dictID, dispatch, isRevision, exerciseMode],
  )

  return saveWordRecord
}

export function useDeleteWordRecord() {
  const deleteWordRecord = useCallback(async (word: string, dict: string) => {
    try {
      const deletedCount = await db.transaction('rw', db.wordRecords, db.deletedWordRecords, async () => {
        const count = await db.wordRecords.where({ word, dict }).delete()
        await markWordRecordDeleted(word, dict)
        return count
      })
      return deletedCount
    } catch (error) {
      console.error(`删除单词记录时出错：`, error)
    }
  }, [])

  return { deleteWordRecord }
}
