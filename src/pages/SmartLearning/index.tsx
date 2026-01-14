import SmartDictationGame from './components/SmartDictationGame'
import SmartQuizPanel from './components/SmartQuizPanel'
import SmartSpellerGame from './components/SmartSpellerGame'
import StageIndicator from './components/StageIndicator'
import Summary from './components/Summary'
import { useSmartLearning } from './hooks/useSmartLearning'
import { currentDictInfoAtom, exerciseModeAtom, selectedChaptersAtom } from '@/store'
import type { Word } from '@/typings'
import type { SmartLearningRecord } from '@/utils/db/smart-learning-record'
import { LearningStage } from '@/utils/db/smart-learning-record'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'

export default function SmartLearning() {
  const navigate = useNavigate()
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const selectedChapters = useAtomValue(selectedChaptersAtom)
  const setExerciseMode = useSetAtom(exerciseModeAtom)
  const { data: wordList } = useSWR(currentDictInfo.url, wordListFetcher)

  const [chapterWords, setChapterWords] = useState<Word[]>([])
  const [completedRecord, setCompletedRecord] = useState<SmartLearningRecord | null>(null)
  const [showSummary, setShowSummary] = useState(false)

  // 获取选中章节的单词
  useEffect(() => {
    if (!wordList || selectedChapters.length === 0) return

    const chapter = selectedChapters[0]
    if (chapter < 0) {
      // 特殊模式，回到主页
      navigate('/typing')
      return
    }

    // 获取章节单词
    const CHAPTER_LENGTH = 20
    const start = chapter * CHAPTER_LENGTH
    const end = (chapter + 1) * CHAPTER_LENGTH
    const words = wordList.slice(start, end)
    setChapterWords(words)
  }, [wordList, selectedChapters, navigate])

  const { session, currentWord, handleCorrect, handleWrong, getProgress, moveToNextGroup, isGroupFinished } = useSmartLearning(
    currentDictInfo.id,
    selectedChapters[0] || 0,
    chapterWords,
  )

  // 处理组完成
  useEffect(() => {
    if (isGroupFinished && session) {
      // 所有单词完成，显示总结
      const record: SmartLearningRecord = {
        dict: session.dict,
        chapter: session.chapter,
        groupNumber: session.currentGroup,
        wordsCount: session.words.length,
        totalTime: Date.now() - session.startTime,
        completedAt: Date.now(),
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
      setCompletedRecord(record)
      setShowSummary(true)
    }
  }, [isGroupFinished, session])

  const handleExit = () => {
    // 清除智能学习会话数据
    localStorage.removeItem('smartLearningSession')
    // 重置练习模式，防止自动跳转回智能学习
    setExerciseMode('speller')
    navigate('/typing')
  }

  const handleContinueNextGroup = () => {
    const result = moveToNextGroup()
    if (result.finished) {
      navigate('/typing')
    } else {
      setShowSummary(false)
      setCompletedRecord(null)
    }
  }

  if (!currentWord || !wordList) {
    if (isGroupFinished) {
      // allow rendering summary even if currentWord is null
    } else {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-xl text-gray-600 dark:text-gray-400">加载中...</div>
        </div>
      )
    }
  }

  if (showSummary && completedRecord) {
    return (
      <Summary
        record={completedRecord}
        onExit={handleExit}
        onContinue={handleContinueNextGroup}
        hasMoreGroups={session ? session.currentGroup < session.totalGroups - 1 : false}
      />
    )
  }

  const wordData = wordList?.find((w) => w.name === currentWord?.word)

  if (!wordData || !currentWord) {
    if (isGroupFinished) {
      return null
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-gray-600 dark:text-gray-400">单词数据加载失败</div>
      </div>
    )
  }

  const progress = getProgress()

  // 将 LearningStage 转换为 QuizMode
  const getQuizMode = (stage: LearningStage) => {
    return stage === LearningStage.ENGLISH_TO_CHINESE ? 'word-to-trans' : 'trans-to-word'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <div className="border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExit}
              className="text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              ← 返回
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">智能学习 - {currentDictInfo.name}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                第{selectedChapters[0] + 1}单元 · 第{session ? session.currentGroup + 1 : 1}组 / 共{session ? session.totalGroups : 1}组
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {progress.completed}/{progress.total}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">已完成</div>
          </div>
        </div>
      </div>

      {/* 主内容区 - 增大宽度以容纳长单词 */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* 进度指示器 */}
        <div className="mb-8">
          <StageIndicator currentStage={currentWord.currentStage} stagesCompleted={currentWord.stagesCompleted} />
        </div>

        {/* 当前阶段内容 */}
        <div className="rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800">
          {(currentWord.currentStage === LearningStage.ENGLISH_TO_CHINESE ||
            currentWord.currentStage === LearningStage.CHINESE_TO_ENGLISH) && (
            <SmartQuizPanel
              word={wordData}
              allWords={chapterWords}
              mode={getQuizMode(currentWord.currentStage)}
              onComplete={handleCorrect}
              onError={handleWrong}
            />
          )}

          {currentWord.currentStage === LearningStage.SPELLER && (
            <SmartSpellerGame word={wordData} onComplete={handleCorrect} onError={handleWrong} />
          )}

          {currentWord.currentStage === LearningStage.TYPING && (
            <SmartDictationGame word={wordData} onComplete={handleCorrect} onError={handleWrong} />
          )}
        </div>
      </div>
    </div>
  )
}
