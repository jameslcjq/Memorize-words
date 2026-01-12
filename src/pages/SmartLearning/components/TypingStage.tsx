import type { Word } from '@/typings'
import { pronounceWord } from '@/utils/pronounce'
import { useEffect, useRef, useState } from 'react'

interface TypingStageProps {
  word: Word
  onCorrect: () => void
  onWrong: (result: { continue?: boolean; showHint?: boolean; hint?: string; downgrade?: boolean; message?: string }) => void
  attempts: number
}

export default function TypingStage({ word, onCorrect, onWrong, attempts }: TypingStageProps) {
  const [input, setInput] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [hint, setHint] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInput('')
    setShowResult(false)
    setIsCorrect(false)
    setHint('')

    // 自动播放单词发音
    pronounceWord(word.name)

    //聚焦输入框
    inputRef.current?.focus()
  }, [word])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || showResult) return

    const userAnswer = input.trim().toLowerCase()
    const correctAnswer = word.name.toLowerCase()
    const correct = userAnswer === correctAnswer

    setIsCorrect(correct)
    setShowResult(true)

    setTimeout(() => {
      if (correct) {
        onCorrect()
      } else {
        const result = onWrong({})
        if (result.showHint && result.hint) {
          setHint(result.hint)
        }
        if (result.downgrade) {
          // 降级消息由父组件处理
        } else {
          // 继续听写，重置输入
          setInput('')
          setShowResult(false)
        }
      }
    }, 1500)
  }

  const handlePlayAgain = () => {
    pronounceWord(word.name)
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      {/* 题目 */}
      <div className="text-center">
        <h2 className="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">请听单词发音并输入完整单词</h2>
        <div className="mb-4 text-2xl font-bold text-gray-800 dark:text-white">{word.trans[0]}</div>
        {attempts > 0 && (
          <div className="mb-2 text-sm text-orange-600 dark:text-orange-400">
            尝试次数: {attempts}/3 {attempts >= 2 && '(下次错误将降级)'}
          </div>
        )}
      </div>

      {/* 播放按钮 */}
      <button
        onClick={handlePlayAgain}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500 text-white transition-all hover:bg-indigo-600 active:scale-95"
        type="button"
      >
        <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </button>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={showResult}
            placeholder="请输入单词..."
            className={`w-full rounded-lg border-2 p-4 text-center font-mono text-2xl transition-all ${
              showResult
                ? isCorrect
                  ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950'
                  : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950'
                : 'border-gray-300 bg-white focus:border-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white'
            }`}
          />
          {hint && !showResult && (
            <div className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              💡 提示：第一个字母是 <span className="font-bold text-indigo-600 dark:text-indigo-400">{hint}</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={showResult || !input.trim()}
          className="mt-4 w-full rounded-lg bg-indigo-500 py-3 font-semibold text-white transition-colors hover:bg-indigo-600 disabled:bg-gray-300 dark:disabled:bg-gray-700"
        >
          提交答案
        </button>
      </form>

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
