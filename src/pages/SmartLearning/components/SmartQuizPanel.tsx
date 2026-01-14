import { useFastPronunciation } from '@/hooks/useFastPronunciation'
import type { Word } from '@/typings'
import { useSaveWordRecord } from '@/utils/db'
import { generateQuizOptions } from '@/utils/quiz'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

type QuizMode = 'word-to-trans' | 'trans-to-word'

interface SmartQuizPanelProps {
  /** 当前单词 */
  word: Word
  /** 所有单词（用于生成选项） */
  allWords: Word[]
  /** 测验模式：英译中 或 中译英 */
  mode: QuizMode
  /** 完成回调（答对） */
  onComplete: () => void
  /** 错误回调（答错） */
  onError: () => void
}

/**
 * SmartQuizPanel - 智能学习模式专用的选择题组件
 * 基于原 QuizPanel 复制，使用回调替代 TypingContext
 */
export default function SmartQuizPanel({ word, allWords, mode, onComplete, onError }: SmartQuizPanelProps) {
  const saveWordRecord = useSaveWordRecord()

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)

  const isWordToTrans = mode === 'word-to-trans'
  const displayField = isWordToTrans ? 'trans' : 'name'

  // 生成选项
  const options = useMemo(() => {
    return generateQuizOptions(word, allWords, 3, displayField)
  }, [word, allWords, displayField])

  const correctAnswer = isWordToTrans ? word.trans.join('；') : word.name

  // 使用快速发音 hook
  const { play: playWord } = useFastPronunciation(word.name)
  const playWordRef = useRef(playWord)
  useEffect(() => {
    playWordRef.current = playWord
  }, [playWord])

  // Reset state when word changes
  useEffect(() => {
    setSelectedIdx(null)
    setIsCorrect(null)
  }, [word])

  const handleSelect = useCallback(
    (option: string, index: number) => {
      if (selectedIdx !== null) return // 防止多次点击

      setSelectedIdx(index)
      const correct = option === correctAnswer
      setIsCorrect(correct)

      if (correct) {
        // 答对了，播放单词发音
        playWordRef.current()

        saveWordRecord({
          word: word.name,
          wrongCount: 0,
          letterTimeArray: [],
          letterMistake: {},
        })
        // 延迟进入下一阶段
        setTimeout(() => {
          onComplete()
          setSelectedIdx(null)
          setIsCorrect(null)
        }, 1000)
      } else {
        saveWordRecord({
          word: word.name,
          wrongCount: 1,
          letterTimeArray: [],
          letterMistake: {},
        })
        // 通知错误
        onError()
        // 答错了，也播放一下正确发音帮助记忆
        setTimeout(() => {
          playWordRef.current()
        }, 500)
        // 停留一下提示错误
        setTimeout(() => {
          onComplete()
          setSelectedIdx(null)
          setIsCorrect(null)
        }, 2500)
      }
    },
    [correctAnswer, onComplete, onError, selectedIdx, saveWordRecord, word.name],
  )

  // 快捷键支持
  useHotkeys('1', () => handleSelect(options[0], 0), [options, handleSelect])
  useHotkeys('2', () => handleSelect(options[1], 1), [options, handleSelect])
  useHotkeys('3', () => handleSelect(options[2], 2), [options, handleSelect])
  useHotkeys('4', () => handleSelect(options[3], 3), [options, handleSelect])

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* 题目区域 */}
      <div className="text-center">
        <h2 className="mb-2 text-4xl font-bold text-gray-800 dark:text-white">{isWordToTrans ? word.name : word.trans.join('；')}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">请从以下选项中选择正确的{isWordToTrans ? '释义' : '单词'}</p>
      </div>

      {/* 选项区域 */}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 px-4 md:grid-cols-2">
        {options.map((option, index) => {
          const isSelected = selectedIdx === index
          const isOptionCorrect = option === correctAnswer

          let bgColor = 'bg-white dark:bg-gray-700 hover:border-indigo-500'
          if (isSelected) {
            bgColor = isCorrect ? 'bg-green-100 dark:bg-green-900 border-green-500' : 'bg-red-100 dark:bg-red-900 border-red-500'
          } else if (selectedIdx !== null && isOptionCorrect) {
            bgColor = 'bg-green-50 dark:bg-green-950 border-green-300'
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(option, index)}
              disabled={selectedIdx !== null}
              className={`flex items-center rounded-xl border-2 p-4 text-left transition-all duration-200 ${bgColor} group border-gray-200 focus:outline-none dark:border-gray-600`}
            >
              <span className="mr-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-500 transition-colors group-hover:bg-indigo-500 group-hover:text-white dark:bg-gray-600 dark:text-gray-300">
                {index + 1}
              </span>
              <span className="flex-1 break-words text-lg text-gray-700 dark:text-gray-200">{option}</span>
            </button>
          )
        })}
      </div>

      <div className="h-4">
        {isCorrect === false && <p className="font-medium text-red-500">答错了，正解：{correctAnswer}</p>}
        {isCorrect === true && <p className="font-medium text-green-500">太棒了！</p>}
      </div>
    </div>
  )
}
