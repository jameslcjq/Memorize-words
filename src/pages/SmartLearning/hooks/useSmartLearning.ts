import type { Word } from '@/typings'
import { getUTCUnixTimestamp } from '@/utils'
import { db } from '@/utils/db'
import type { SmartLearningRecord, SmartLearningSession, WordProgress } from '@/utils/db/smart-learning-record'
import { LearningStage, WordProgressRecord } from '@/utils/db/smart-learning-record'
import { useCallback, useEffect, useState } from 'react'

const SESSION_KEY = 'smartLearningSession'
const WORDS_PER_GROUP = 10

/**
 * 学习任务 - 代表一个单词的某个模式
 */
interface LearningTask {
  word: string
  stage: LearningStage
}

/**
 * 智能学习队列管理（交错模式）
 *
 * 初级阶段：多个单词的 A/B 模式随机交错出现
 * 高级阶段：完成 A+B 的单词的 C/D 模式随机交错出现
 */
class SmartLearningQueue {
  private words: WordProgress[]
  private taskQueue: LearningTask[] // 当前任务队列

  constructor(words: WordProgress[]) {
    this.words = words
    this.taskQueue = []
    this.buildInitialQueue()
  }

  /**
   * 构建初始任务队列（初级阶段 A/B 模式）
   */
  private buildInitialQueue() {
    const tasks: LearningTask[] = []

    for (const word of this.words) {
      // 每个单词添加 A 和 B 两个任务
      tasks.push({ word: word.word, stage: LearningStage.ENGLISH_TO_CHINESE })
      tasks.push({ word: word.word, stage: LearningStage.CHINESE_TO_ENGLISH })
    }

    // 随机打乱
    this.taskQueue = this.shuffle(tasks)
  }

  /**
   * 洗牌算法
   */
  private shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }

  /**
   * 获取下一个任务
   */
  getNext(): LearningTask | null {
    if (this.taskQueue.length === 0) {
      return null
    }
    return this.taskQueue[0]
  }

  /**
   * 完成当前任务（答对了）
   */
  completeCurrentTask() {
    if (this.taskQueue.length === 0) return

    const task = this.taskQueue.shift()!
    const wordProgress = this.words.find((w) => w.word === task.word)

    if (!wordProgress) return

    // 标记该阶段完成
    const stageKey = this.stageToKey(task.stage)
    if (stageKey) {
      wordProgress.stagesCompleted[stageKey] = true
    }

    // 检查是否需要添加高级阶段任务
    this.checkAndAddAdvancedTasks(wordProgress)

    // 检查单词是否完全掌握
    if (this.isWordMastered(wordProgress)) {
      wordProgress.currentStage = LearningStage.COMPLETED
    }
  }

  /**
   * 任务失败（答错了）- 将任务移到队列后面
   */
  failCurrentTask() {
    if (this.taskQueue.length === 0) return

    const task = this.taskQueue.shift()!

    // 随机插入到队列后半部分
    const insertPos = Math.floor(this.taskQueue.length / 2) + Math.floor(Math.random() * (this.taskQueue.length / 2 + 1))
    this.taskQueue.splice(Math.min(insertPos, this.taskQueue.length), 0, task)
  }

  /**
   * 检查并添加高级阶段任务（C/D 模式）
   */
  private checkAndAddAdvancedTasks(wordProgress: WordProgress) {
    const { englishToChinese, chineseToEnglish, speller, typing } = wordProgress.stagesCompleted

    // 如果 A 和 B 都完成了，且 C 和 D 还没开始，添加 C/D 任务
    if (englishToChinese && chineseToEnglish) {
      // 检查 C 任务是否已在队列中或已完成
      const cInQueue = this.taskQueue.some((t) => t.word === wordProgress.word && t.stage === LearningStage.SPELLER)
      if (!speller && !cInQueue) {
        // 随机插入到队列中
        const insertPos = Math.floor(Math.random() * (this.taskQueue.length + 1))
        this.taskQueue.splice(insertPos, 0, { word: wordProgress.word, stage: LearningStage.SPELLER })
      }

      // 检查 D 任务是否已在队列中或已完成
      const dInQueue = this.taskQueue.some((t) => t.word === wordProgress.word && t.stage === LearningStage.TYPING)
      if (!typing && !dInQueue) {
        const insertPos = Math.floor(Math.random() * (this.taskQueue.length + 1))
        this.taskQueue.splice(insertPos, 0, { word: wordProgress.word, stage: LearningStage.TYPING })
      }
    }
  }

  /**
   * 检查单词是否完全掌握
   */
  private isWordMastered(wordProgress: WordProgress): boolean {
    const { englishToChinese, chineseToEnglish, speller, typing } = wordProgress.stagesCompleted
    return englishToChinese && chineseToEnglish && speller && typing
  }

  /**
   * 将阶段枚举转换为对象键
   */
  private stageToKey(stage: LearningStage): keyof WordProgress['stagesCompleted'] | null {
    switch (stage) {
      case LearningStage.ENGLISH_TO_CHINESE:
        return 'englishToChinese'
      case LearningStage.CHINESE_TO_ENGLISH:
        return 'chineseToEnglish'
      case LearningStage.SPELLER:
        return 'speller'
      case LearningStage.TYPING:
        return 'typing'
      default:
        return null
    }
  }

  /**
   * 获取进度
   */
  getProgress() {
    const completed = this.words.filter((w) => this.isWordMastered(w)).length
    return {
      completed,
      total: this.words.length,
      percentage: this.words.length > 0 ? (completed / this.words.length) * 100 : 0,
    }
  }

  /**
   * 检查是否全部完成
   */
  isAllCompleted(): boolean {
    return this.taskQueue.length === 0 && this.words.every((w) => this.isWordMastered(w))
  }

  /**
   * 获取所有单词进度
   */
  getWords() {
    return this.words
  }

  /**
   * 获取当前任务队列长度
   */
  getRemainingTasks(): number {
    return this.taskQueue.length
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

export function useSmartLearning(dict: string, chapter: number, allWords: Word[]) {
  const [session, setSession] = useState<SmartLearningSession | null>(null)
  const [queue, setQueue] = useState<SmartLearningQueue | null>(null)
  const [currentTask, setCurrentTask] = useState<LearningTask | null>(null)
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
          setSession(parsed)
          const q = new SmartLearningQueue(parsed.words)
          setQueue(q)

          const progress = q.getProgress()
          if (progress.completed === progress.total) {
            setIsGroupFinished(true)
            setCurrentTask(null)
          } else {
            setCurrentTask(q.getNext())
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
    setCurrentTask(q.getNext())
    setStageStartTime(Date.now())
    setIsGroupFinished(false)

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

    await db.smartLearningRecords.add(record)
  }, [session])

  /**
   * 处理答题正确
   */
  const handleCorrect = useCallback(() => {
    if (!queue || !session || !currentTask) return

    // 完成当前任务
    queue.completeCurrentTask()

    // 更新会话
    const updatedWords = queue.getWords()
    const updatedSession = { ...session, words: [...updatedWords] }
    saveSession(updatedSession)

    // 检查是否全部完成
    if (queue.isAllCompleted()) {
      setIsGroupFinished(true)
      setCurrentTask(null)
      saveCompletedGroup()
      return
    }

    // 获取下一个任务
    const next = queue.getNext()
    setCurrentTask(next)
    setStageStartTime(Date.now())
  }, [queue, session, currentTask, saveSession, saveCompletedGroup])

  /**
   * 处理答题错误
   */
  const handleWrong = useCallback(() => {
    if (!queue || !session || !currentTask) return

    // 任务失败，移到队列后面
    queue.failCurrentTask()

    // 更新会话
    const updatedWords = queue.getWords()
    const updatedSession = { ...session, words: [...updatedWords] }
    saveSession(updatedSession)

    // 获取下一个任务
    const next = queue.getNext()
    setCurrentTask(next)
    setStageStartTime(Date.now())
  }, [queue, session, currentTask, saveSession])

  /**
   * 进入下一组
   */
  const moveToNextGroup = useCallback(() => {
    if (!session) return { finished: true }

    const groups = chunkWords(allWords, WORDS_PER_GROUP)
    const nextGroupIndex = session.currentGroup + 1

    if (nextGroupIndex >= groups.length) {
      localStorage.removeItem(SESSION_KEY)
      setSession(null)
      return { finished: true }
    }

    const nextGroup = groups[nextGroupIndex]
    const wordProgresses = nextGroup.map((word) => new WordProgressRecord(word.name, session.dict))

    const newSession: SmartLearningSession = {
      ...session,
      currentGroup: nextGroupIndex,
      totalGroups: groups.length,
      words: wordProgresses,
      startTime: getUTCUnixTimestamp(),
      totalTime: 0,
    }

    setSession(newSession)
    const q = new SmartLearningQueue(wordProgresses)
    setQueue(q)
    setCurrentTask(q.getNext())
    setStageStartTime(Date.now())
    setIsGroupFinished(false)

    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession))
    return { finished: false }
  }, [session, allWords])

  /**
   * 初始化
   */
  useEffect(() => {
    if (allWords.length > 0) {
      initSession()
    }
  }, [initSession, allWords.length])

  // 构造当前单词进度对象（用于渲染 StageIndicator）
  const currentWord = currentTask
    ? {
        word: currentTask.word,
        currentStage: currentTask.stage,
        stagesCompleted: queue?.getWords().find((w) => w.word === currentTask.word)?.stagesCompleted || {
          englishToChinese: false,
          chineseToEnglish: false,
          speller: false,
          typing: false,
        },
        typingAttempts: queue?.getWords().find((w) => w.word === currentTask.word)?.typingAttempts || 0,
        downgrades: queue?.getWords().find((w) => w.word === currentTask.word)?.downgrades || 0,
      }
    : null

  return {
    session,
    currentWord,
    queue,
    handleCorrect,
    handleWrong,
    getProgress: () => queue?.getProgress() || { completed: 0, total: 0, percentage: 0 },
    moveToNextGroup,
    isGroupFinished,
    remainingTasks: queue?.getRemainingTasks() || 0,
  }
}
