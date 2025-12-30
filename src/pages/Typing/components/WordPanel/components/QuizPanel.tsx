import { TypingContext, TypingStateActionType } from '../../../store'
import usePronunciationSound from '@/hooks/usePronunciation'
import useSpeech from '@/hooks/useSpeech'
import { exerciseModeAtom } from '@/store'
import type { Word } from '@/typings'
import { useSaveWordRecord } from '@/utils/db'
import { generateQuizOptions } from '@/utils/quiz'
import { useAtomValue } from 'jotai'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

interface QuizPanelProps {
  word: Word
  allWords: Word[]
  onFinish: () => void
}

export default function QuizPanel({ word, allWords, onFinish }: QuizPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { dispatch } = useContext(TypingContext)!
  const mode = useAtomValue(exerciseModeAtom)
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

  // Audio hooks
  const { play: playWord } = usePronunciationSound(word.name)
  const { speak: speakDef, cancel: cancelDef } = useSpeech(word.trans.join('；'))

  const playSound = useCallback(() => {
    playWord()
    // 中译英模式下，只读英文，不读释义
    if (mode === 'trans-to-word') return

    setTimeout(() => {
      speakDef()
    }, 800)
  }, [playWord, speakDef, mode])

  // Cleanup speech on unmount or word change
  useEffect(() => {
    return () => {
      cancelDef()
    }
  }, [cancelDef, word])

  const handleSelect = useCallback(
    (option: string, index: number) => {
      if (selectedIdx !== null) return // 防止多次点击

      setSelectedIdx(index)
      const correct = option === correctAnswer
      setIsCorrect(correct)

      // Play sound regardless of correctness (read the correct word and def)
      playSound()

      if (correct) {
        dispatch({ type: TypingStateActionType.REPORT_CORRECT_WORD })
        saveWordRecord({
          word: word.name,
          wrongCount: 0,
          letterTimeArray: [],
          letterMistake: {},
        })
        // 延迟进入下一题 (increased delay to allow some audio to play)
        setTimeout(() => {
          onFinish()
          setSelectedIdx(null)
          setIsCorrect(null)
          cancelDef()
        }, 2500)
      } else {
        dispatch({ type: TypingStateActionType.REPORT_WRONG_WORD, payload: { letterMistake: {} } })
        saveWordRecord({
          word: word.name,
          wrongCount: 1,
          letterTimeArray: [],
          letterMistake: {},
        })
        // 如果答错，停留一下提示错误
        setTimeout(() => {
          onFinish()
          setSelectedIdx(null)
          setIsCorrect(null)
          cancelDef()
        }, 3500)
      }
    },
    [correctAnswer, dispatch, onFinish, selectedIdx, saveWordRecord, word.name, playSound, cancelDef],
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
            // 如果答错了，把正确答案也标出来
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
