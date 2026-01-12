import type { Word } from '@/typings'
import { getUTCUnixTimestamp } from '@/utils'
import { db } from '@/utils/db'
import type { SmartLearningRecord, SmartLearningSession, WordProgress } from '@/utils/db/smart-learning-record'
import { LearningStage, WordProgressRecord } from '@/utils/db/smart-learning-record'
import { useCallback, useEffect, useState } from 'react'

const SESSION_KEY = 'smartLearningSession'
const WORDS_PER_GROUP = 10

/**
 * 智能学习队列管理
 */
class SmartLearningQueue {
  private words: WordProgress[]

  constructor(words: WordProgress[]) {
    this.words = words
  }

  /**
   * 获取下一个要学习的单词
   */
  getNext(): WordProgress | null {
    for (const word of this.words) {
      if (word.currentStage !== LearningStage.COMPLETED) {
        return word
      }
    }
    return null // 所有单词都完成了
  }

  /**
   * 单词答错后，移到队尾
   */
  moveToEnd(wordToMove: WordProgress) {
    const index = this.words.findIndex((w) => w.word === wordToMove.word)
    if (index !== -1) {
      const [word] = this.words.splice(index, 1)
      this.words.push(word)
    }
  }

  /**
   * 单词完成后，标记为完成
   */
  complete(wordToComplete: WordProgress) {
    const word = this.words.find((w) => w.word === wordToComplete.word)
    if (word) {
      word.currentStage = LearningStage.COMPLETED
    }
  }

  /**
   * 获取进度
   */
  getProgress() {
    const completed = this.words.filter((w) => w.currentStage === LearningStage.COMPLETED).length
    return {
      completed,
      total: this.words.length,
      percentage: (completed / this.words.length) * 100,
    }
  }

  /**
   * 获取所有单词
   */
  getWords() {
    return this.words
  }
}

/**
 * 将单词列表分组
 */
function chunkWords(words: Word[], chunkSize: number): Word[][] {
  const chunks: Word[][] = []
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize))
  }
  return chunks
}

/**
 * 获取下一个题型
 */
function getNextQuizType(progress: WordProgress): LearningStage {
  const { englishToChinese, chineseToEnglish } = progress.stagesCompleted

  if (!englishToChinese && !chineseToEnglish) {
    // 两个都没完成，随机选一个
    return Math.random() > 0.5 ? LearningStage.ENGLISH_TO_CHINESE : LearningStage.CHINESE_TO_ENGLISH
  } else if (!englishToChinese) {
    // 只剩英译中
    return LearningStage.ENGLISH_TO_CHINESE
  } else {
    // 只剩中译英
    return LearningStage.CHINESE_TO_ENGLISH
  }
}

export function useSmartLearning(dict: string, chapter: number, allWords: Word[]) {
  const [session, setSession] = useState<SmartLearningSession | null>(null)
  const [queue, setQueue] = useState<SmartLearningQueue | null>(null)
  const [currentWord, setCurrentWord] = useState<WordProgress | null>(null)
  const [stageStartTime, setStageStartTime] = useState<number>(Date.now())
  const [isGroupFinished, setIsGroupFinished] = useState(false)

  /**
   * 初始化学习会话
   */
  const initSession = useCallback(() => {
    // 尝试从localStorage恢复会话
    const savedSession = localStorage.getItem(SESSION_KEY)
    if (savedSession) {
      try {
        const parsed: SmartLearningSession = JSON.parse(savedSession)
        if (parsed.dict === dict && parsed.chapter === chapter) {
          // 恢复之前的会话
          setSession(parsed)
          const q = new SmartLearningQueue(parsed.words)
          setQueue(q)
          // 如果这组已经完成了（可能是在 Summary 页面刷新），我们需要检查
          const progress = q.getProgress()
          if (progress.completed === progress.total) {
            setIsGroupFinished(true)
            setCurrentWord(null)
          } else {
            setCurrentWord(q.getNext())
          }
          return
        }
      } catch (e) {
        console.error('Failed to restore session:', e)
      }
    }

    // 创建新会话
    const groups = chunkWords(allWords, WORDS_PER_GROUP)
    if (groups.length === 0) return

    const firstGroup = groups[0]
    const wordProgresses = firstGroup.map((word) => new WordProgressRecord(word.name, dict))

    const newSession: SmartLearningSession = {
      dict,
      chapter,
      currentGroup: 0,
      totalGroups: groups.length,
      words: wordProgresses,
      startTime: getUTCUnixTimestamp(),
      totalTime: 0,
    }

    setSession(newSession)
    const q = new SmartLearningQueue(wordProgresses)
    setQueue(q)
    setCurrentWord(q.getNext())
    setStageStartTime(Date.now())
    setIsGroupFinished(false)

    // 保存到localStorage
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
  }, [dict, chapter, allWords])

  /**
   * 保存会话到localStorage
   */
  const saveSession = useCallback((updatedSession: SmartLearningSession) => {
    setSession(updatedSession)
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession))
  }, [])

  /**
   * 完成当前阶段
   */
  const completeStage = useCallback(
    (stage: LearningStage) => {
      if (!currentWord || !session || stage === LearningStage.COMPLETED) return

      const duration = Date.now() - stageStartTime
      // Casting to any to allow indexing by enum, or we can use switch/if
      // But since we checked for COMPLETED, the remaining values match keys partially
      // To be safe and TS-friendly without extensive casting:
      const stageKeyMap: Partial<Record<LearningStage, keyof typeof currentWord.stageTimes>> = {
        [LearningStage.ENGLISH_TO_CHINESE]: 'englishToChinese',
        [LearningStage.CHINESE_TO_ENGLISH]: 'chineseToEnglish',
        [LearningStage.SPELLER]: 'speller',
        [LearningStage.TYPING]: 'typing',
      }

      const key = stageKeyMap[stage]
      if (key) {
        currentWord.stageTimes[key] = duration
        currentWord.stagesCompleted[key as keyof typeof currentWord.stagesCompleted] = true
      }

      // 重置计时器
      setStageStartTime(Date.now())

      // 更新会话
      const updatedWords = session.words.map((w) => (w.word === currentWord.word ? currentWord : w))
      const updatedSession = { ...session, words: updatedWords }
      saveSession(updatedSession)
    },
    [currentWord, session, stageStartTime, saveSession],
  )

  /**
   * 保存已完成的组记录
   */
  const saveCompletedGroup = useCallback(async () => {
    if (!session) return

    const totalTime = Date.now() - session.startTime

    const record: SmartLearningRecord = {
      dict: session.dict,
      chapter: session.chapter,
      groupNumber: session.currentGroup,
      wordsCount: session.words.length,
      totalTime,
      completedAt: getUTCUnixTimestamp(),
      wordDetails: session.words.map((w) => ({
        word: w.word,
        stageTimes: {
          englishToChinese: w.stageTimes.englishToChinese || 0,
          chineseToEnglish: w.stageTimes.chineseToEnglish || 0,
          speller: w.stageTimes.speller || 0,
          typing: w.stageTimes.typing || 0,
        },
        typingAttempts: w.typingAttempts,
        downgrades: w.downgrades,
      })),
    }

    // 保存到数据库
    await db.smartLearningRecords.add(record)

    // 注意：这里不再清除 session，因为可能还有下一组
  }, [session])

  /**
   * 处理答题正确
   */
  const handleCorrect = useCallback(() => {
    if (!currentWord || !queue || !session) return

    const stage = currentWord.currentStage

    // 完成当前阶段
    completeStage(stage)

    // 判断下一步
    if (stage === LearningStage.ENGLISH_TO_CHINESE || stage === LearningStage.CHINESE_TO_ENGLISH) {
      // 阶段1：认知阶段
      const { englishToChinese, chineseToEnglish } = currentWord.stagesCompleted
      if (englishToChinese && chineseToEnglish) {
        // 两个都完成了，进入阶段2
        currentWord.currentStage = LearningStage.SPELLER
      } else {
        // 还有一个没完成，切换到另一个题型
        currentWord.currentStage = getNextQuizType(currentWord)
      }
    } else if (stage === LearningStage.SPELLER) {
      // 阶段2：单词填空完成，进入阶段3
      currentWord.currentStage = LearningStage.TYPING
    } else if (stage === LearningStage.TYPING) {
      // 阶段3：听写完成，单词学习完成
      queue.complete(currentWord)

      // 检查是否所有单词都完成了
      const progress = queue.getProgress()
      if (progress.completed === progress.total) {
        // 当前组完成
        setIsGroupFinished(true)
        saveCompletedGroup()
        return
      }
    }

    // 更新会话
    const updatedWords = session.words.map((w) => (w.word === currentWord.word ? currentWord : w))
    saveSession({ ...session, words: updatedWords })

    // 获取下一个单词
    const next = queue.getNext()
    setCurrentWord(next)
  }, [currentWord, queue, session, completeStage, saveSession, saveCompletedGroup])

  /**
   * 进入下一组
   */
  const moveToNextGroup = useCallback(() => {
    if (!session) return { finished: true }

    const groups = chunkWords(allWords, WORDS_PER_GROUP)
    const nextGroupIndex = session.currentGroup + 1

    if (nextGroupIndex >= groups.length) {
      // 所有组都完成了
      localStorage.removeItem(SESSION_KEY)
      setSession(null)
      return { finished: true }
    }

    const nextGroup = groups[nextGroupIndex]
    const wordProgresses = nextGroup.map((word) => new WordProgressRecord(word.name, session.dict))

    const newSession: SmartLearningSession = {
      ...session,
      currentGroup: nextGroupIndex,
      totalGroups: groups.length, // Ensure totalGroups is consistent
      words: wordProgresses,
      startTime: getUTCUnixTimestamp(),
      totalTime: 0,
    }

    setSession(newSession)
    const q = new SmartLearningQueue(wordProgresses)
    setQueue(q)
    setCurrentWord(q.getNext())
    setStageStartTime(Date.now())
    setIsGroupFinished(false)

    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
    return { finished: false }
  }, [session, allWords])

  // ... handleWrong is unchanged mostly, but we need to include it in the hook return

  /**
   * 处理答题错误
   */
  const handleWrong = useCallback(() => {
    if (!currentWord || !queue || !session) return

    const stage = currentWord.currentStage

    if (stage === LearningStage.ENGLISH_TO_CHINESE || stage === LearningStage.CHINESE_TO_ENGLISH) {
      // 阶段1错误：继续当前题型
      return { continue: true }
    } else if (stage === LearningStage.SPELLER) {
      // 阶段2错误（严格模式）：移到队尾，重新开始
      // 重置该单词的进度
      currentWord.currentStage = Math.random() > 0.5 ? LearningStage.ENGLISH_TO_CHINESE : LearningStage.CHINESE_TO_ENGLISH
      currentWord.stagesCompleted = {
        englishToChinese: false,
        chineseToEnglish: false,
        speller: false,
        typing: false,
      }
      currentWord.stageTimes = {}

      // 移到队尾
      queue.moveToEnd(currentWord)

      // 获取下一个单词
      const next = queue.getNext()
      setCurrentWord(next)

      // 更新会话
      const updatedWords = session.words.map((w) => (w.word === currentWord.word ? currentWord : w))
      saveSession({ ...session, words: updatedWords })

      return { moveToEnd: true, message: '移到队尾重新学习' }
    } else if (stage === LearningStage.TYPING) {
      // 阶段3错误：记录尝试次数
      currentWord.typingAttempts++

      if (currentWord.typingAttempts === 1) {
        // 第1次错误，继续听写
        return { continue: true, showHint: false }
      } else if (currentWord.typingAttempts === 2) {
        // 第2次错误，显示首字母提示
        return { continue: true, showHint: true, hint: currentWord.word[0] }
      } else if (currentWord.typingAttempts >= 3) {
        // 第3次错误，降级
        currentWord.currentStage = LearningStage.SPELLER
        currentWord.typingAttempts = 0
        currentWord.stagesCompleted.typing = false
        currentWord.stagesCompleted.speller = false
        currentWord.downgrades++

        // 更新会话
        const updatedWords = session.words.map((w) => (w.word === currentWord.word ? currentWord : w))
        saveSession({ ...session, words: updatedWords })

        return { downgrade: true, message: '降级回单词填空' }
      }
    }

    return { continue: true }
  }, [currentWord, queue, session, saveSession])

  /**
   * 初始化
   */
  useEffect(() => {
    if (allWords.length > 0) {
      initSession()
    }
  }, [initSession, allWords.length])

  return {
    session,
    currentWord,
    queue,
    handleCorrect,
    handleWrong,
    getProgress: () => queue?.getProgress() || { completed: 0, total: 0, percentage: 0 },
    moveToNextGroup,
    isGroupFinished,
  }
}
