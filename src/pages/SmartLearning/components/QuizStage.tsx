import type { Word } from '@/typings'
import { LearningStage } from '@/utils/db/smart-learning-record'
import { useEffect, useState } from 'react'

interface QuizStageProps {
  word: Word
  stage: LearningStage.ENGLISH_TO_CHINESE | LearningStage.CHINESE_TO_ENGLISH
  onCorrect: () => void
  onWrong: () => void
  allWords: Word[]
}

export default function QuizStage({ word, stage, onCorrect, onWrong, allWords }: QuizStageProps) {
  const [options, setOptions] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  const isEnglishToChinese = stage === LearningStage.ENGLISH_TO_CHINESE

  useEffect(() => {
    // 生成选项（1个正确答案 + 3个错误答案）
    const correctAnswer = isEnglishToChinese ? word.trans[0] || '' : word.name
    const wrongOptions: string[] = []

    // 从其他单词中随机选择3个错误答案
    const otherWords = allWords.filter((w) => w.name !== word.name)
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5)

    for (const w of shuffled) {
      if (wrongOptions.length >= 3) break
      const wrongAnswer = isEnglishToChinese ? w.trans[0] || '' : w.name
      if (wrongAnswer !== correctAnswer && !wrongOptions.includes(wrongAnswer)) {
        wrongOptions.push(wrongAnswer)
      }
    }

    // 合并并打乱顺序
    const allOptions = [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5)
    setOptions(allOptions)
    setSelected(null)
    setShowResult(false)
  }, [word, stage, isEnglishToChinese, allWords])

  const handleSelect = (option: string) => {
    if (showResult) return

    setSelected(option)
    setShowResult(true)

    const correctAnswer = isEnglishToChinese ? word.trans[0] : word.name
    const isCorrect = option === correctAnswer

    setTimeout(() => {
      if (isCorrect) {
        onCorrect()
      } else {
        onWrong()
        setShowResult(false)
        setSelected(null)
      }
    }, 1000)
  }

  const correctAnswer = isEnglishToChinese ? word.trans[0] : word.name

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* 题目 */}
      <div className="text-center">
        <h2 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
          {isEnglishToChinese ? '请选择这个单词的中文意思' : '请选择这个中文对应的英文单词'}
        </h2>
        <div className="text-4xl font-bold text-gray-800 dark:text-white">{isEnglishToChinese ? word.name : word.trans[0]}</div>
      </div>

      {/* 选项 */}
      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 md:grid-cols-2">
        {options.map((option, index) => {
          const isCorrectOption = option === correctAnswer
          const isSelected = selected === option
          const showCorrect = showResult && isCorrectOption
          const showWrong = showResult && isSelected && !isCorrectOption

          return (
            <button
              key={index}
              onClick={() => handleSelect(option)}
              disabled={showResult}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                showCorrect
                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                  : showWrong
                  ? 'border-red-500 bg-red-50 dark:bg-red-950'
                  : 'border-gray-300 bg-white hover:border-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-indigo-400'
              } ${showResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <span className="mr-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1 text-lg font-medium text-gray-800 dark:text-white">{option}</span>
                {showCorrect && <span className="text-2xl">✓</span>}
                {showWrong && <span className="text-2xl">✗</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
