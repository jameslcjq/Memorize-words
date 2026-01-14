import type { Word } from '@/typings'
import { useEffect, useState } from 'react'

interface SpellerStageProps {
  word: Word
  onCorrect: () => void
  onWrong: () => void
}

export default function SpellerStage({ word, onCorrect, onWrong }: SpellerStageProps) {
  const [inputs, setInputs] = useState<string[]>([])
  const [blanks, setBlanks] = useState<number[]>([])
  const [candidateLetters, setCandidateLetters] = useState<string[]>([])
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)

  useEffect(() => {
    // 生成填空位置（随机选择40%的字母作为空白）
    const wordLength = word.name.length
    const blankCount = Math.max(1, Math.ceil(wordLength * 0.4))
    const positions: number[] = []

    while (positions.length < blankCount) {
      const pos = Math.floor(Math.random() * wordLength)
      if (!positions.includes(pos)) {
        positions.push(pos)
      }
    }

    positions.sort((a, b) => a - b)
    setBlanks(positions)

    // 初始化输入数组
    const newInputs = Array(wordLength).fill('')
    positions.forEach((pos) => {
      newInputs[pos] = '_'
    })
    setInputs(newInputs)

    // 生成候选字母（正确字母 + 一些干扰字母）
    const correctLetters = positions.map((pos) => word.name[pos].toLowerCase())
    const distractors = 'abcdefghijklmnopqrstuvwxyz'
      .split('')
      .filter((letter) => !correctLetters.includes(letter))
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)

    const allCandidates = [...correctLetters, ...distractors].sort(() => Math.random() - 0.5)
    setCandidateLetters(allCandidates)

    setShowResult(false)
    setIsCorrect(false)
  }, [word])

  const handleLetterClick = (letter: string) => {
    if (showResult) return

    // 找到第一个空白位置
    const firstBlankIndex = inputs.findIndex((input) => input === '_')
    if (firstBlankIndex === -1) return

    // 填入字母
    const newInputs = [...inputs]
    newInputs[firstBlankIndex] = letter

    setInputs(newInputs)

    // 检查是否所有空白都已填写
    if (!newInputs.includes('_')) {
      checkAnswer(newInputs)
    }
  }

  const checkAnswer = (filledInputs: string[]) => {
    // 只检查空白位置是否填写正确
    let correct = true
    for (const pos of blanks) {
      if (filledInputs[pos].toLowerCase() !== word.name[pos].toLowerCase()) {
        correct = false
        break
      }
    }

    setIsCorrect(correct)
    setShowResult(true)

    setTimeout(() => {
      if (correct) {
        onCorrect()
      } else {
        onWrong()
      }
    }, 1500)
  }

  const handleClear = () => {
    if (showResult) return

    const newInputs = [...inputs]
    blanks.forEach((pos) => {
      newInputs[pos] = '_'
    })
    setInputs(newInputs)
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* 题目 */}
      <div className="text-center">
        <h2 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">请填写缺少的字母</h2>
        <div className="mb-4 text-2xl font-bold text-gray-800 dark:text-white">{word.trans[0]}</div>
      </div>

      {/* 单词输入区域 */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {inputs.map((letter, index) => {
          const isBlank = blanks.includes(index)
          const isEmpty = letter === '_'

          return (
            <div
              key={index}
              className={`flex h-16 w-12 items-center justify-center rounded-lg border-2 text-3xl font-bold transition-all ${
                showResult
                  ? isCorrect
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950'
                    : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950'
                  : isBlank
                  ? isEmpty
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950'
                    : 'border-indigo-500 bg-indigo-100 text-indigo-700 dark:bg-indigo-900'
                  : 'border-gray-300 bg-gray-100 text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {isEmpty ? '' : isBlank ? letter : word.name[index]}
            </div>
          )
        })}
      </div>

      {/* 候选字母 */}
      {!showResult && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center gap-2">
            {candidateLetters.map((letter, index) => (
              <button
                key={index}
                onClick={() => handleLetterClick(letter)}
                className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-gray-300 bg-white text-xl font-bold text-gray-700 transition-all hover:border-indigo-500 hover:bg-indigo-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-indigo-950"
              >
                {letter}
              </button>
            ))}
          </div>
          <button
            onClick={handleClear}
            className="rounded-lg bg-gray-200 px-6 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            清空
          </button>
        </div>
      )}

      {/* 结果提示 */}
      {showResult && (
        <div
          className={`rounded-lg p-4 text-center text-lg font-semibold ${
            isCorrect
              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
          }`}
        >
          {isCorrect ? '✓ 正确！' : `✗ 错误，正确答案是：${word.name}`}
        </div>
      )}
    </div>
  )
}
