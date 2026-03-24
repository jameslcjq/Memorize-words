// Daily Challenge Game Component
import { useGamification } from '@/hooks/useGamification'
import usePronunciationSound from '@/hooks/usePronunciation'
import { currentDictInfoAtom } from '@/store'
import type { Word } from '@/typings'
import shuffle from '@/utils/shuffle'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import IconClock from '~icons/tabler/clock'
import IconTrophy from '~icons/tabler/trophy'

const CHALLENGE_DURATION = 60 // seconds
const CHALLENGE_WORD_COUNT = 20

type GameState = 'ready' | 'playing' | 'finished'

export default function DailyChallengeGame() {
  const navigate = useNavigate()
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const { data: wordList } = useSWR(currentDictInfo.url, wordListFetcher)
  const { awardDailyChallengePoints, saveDailyChallenge, checkAchievements, isTodayChallengeCompleted } = useGamification()

  const [gameState, setGameState] = useState<GameState>('ready')
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_DURATION)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [challengeWords, setChallengeWords] = useState<Word[]>([])

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<number | null>(null)

  const currentWord = challengeWords[currentIndex]
  const { play: playWord } = usePronunciationSound(currentWord?.name || '')

  // Generate challenge words
  useEffect(() => {
    if (wordList && wordList.length > 0) {
      const shuffled = shuffle([...wordList])
      setChallengeWords(shuffled.slice(0, CHALLENGE_WORD_COUNT))
    }
  }, [wordList])

  // Timer logic
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setGameState('finished')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameState])

  // Auto-play pronunciation when word changes
  useEffect(() => {
    if (gameState === 'playing' && currentWord) {
      setTimeout(() => playWord(), 200)
    }
  }, [currentIndex, gameState, currentWord, playWord])

  // Focus input when game starts
  useEffect(() => {
    if (gameState === 'playing') {
      inputRef.current?.focus()
    }
  }, [gameState])

  // Save result when finished
  useEffect(() => {
    if (gameState === 'finished') {
      const saveResult = async () => {
        const today = new Date().toISOString().split('T')[0]
        await saveDailyChallenge({
          date: today,
          score,
          wordsCompleted: currentIndex,
          wordsTotal: CHALLENGE_WORD_COUNT,
          timeSpent: CHALLENGE_DURATION - timeLeft,
          completedAt: Date.now(),
        })
        await awardDailyChallengePoints(score)
        await checkAchievements()
      }
      saveResult()
    }
  }, [gameState, score, currentIndex, timeLeft, awardDailyChallengePoints, saveDailyChallenge, checkAchievements])

  const startGame = useCallback(() => {
    setGameState('playing')
    setTimeLeft(CHALLENGE_DURATION)
    setCurrentIndex(0)
    setScore(0)
    setUserInput('')
    setIsCorrect(null)
  }, [])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!currentWord || gameState !== 'playing') return

      const isWordCorrect = userInput.toLowerCase().trim() === currentWord.name.toLowerCase()
      setIsCorrect(isWordCorrect)

      if (isWordCorrect) {
        setScore((prev) => prev + 5)
      }

      // Move to next word after brief feedback
      setTimeout(() => {
        if (currentIndex >= challengeWords.length - 1) {
          setGameState('finished')
        } else {
          setCurrentIndex((prev) => prev + 1)
          setUserInput('')
          setIsCorrect(null)
          inputRef.current?.focus()
        }
      }, 500)
    },
    [currentWord, userInput, currentIndex, challengeWords.length, gameState],
  )

  const handleSkip = useCallback(() => {
    if (currentIndex >= challengeWords.length - 1) {
      setGameState('finished')
    } else {
      setCurrentIndex((prev) => prev + 1)
      setUserInput('')
      setIsCorrect(null)
      inputRef.current?.focus()
    }
  }, [currentIndex, challengeWords.length])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Already completed today
  if (isTodayChallengeCompleted && gameState === 'ready') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-gray-800">
          <div className="mb-4 text-6xl">✅</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">今日挑战已完成</h2>
          <p className="mb-6 text-gray-500 dark:text-gray-400">明天再来挑战吧！</p>
          <button
            onClick={() => navigate('/')}
            className="rounded-xl bg-indigo-500 px-6 py-3 font-bold text-white transition-all hover:bg-indigo-600"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  // Ready state
  if (gameState === 'ready') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-gray-800">
          <div className="mb-4 text-6xl">⏱️</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">每日挑战</h2>
          <p className="mb-2 text-gray-500 dark:text-gray-400">听发音，快速拼写单词</p>
          <div className="mb-6 text-sm text-gray-400">
            <p>• {CHALLENGE_WORD_COUNT} 个单词</p>
            <p>• {CHALLENGE_DURATION} 秒限时</p>
            <p>• 每日一次机会</p>
          </div>
          <button
            onClick={startGame}
            className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:scale-105"
          >
            开始挑战
          </button>
        </div>
      </div>
    )
  }

  // Finished state
  if (gameState === 'finished') {
    const accuracy = Math.round((score / (CHALLENGE_WORD_COUNT * 5)) * 100)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl dark:bg-gray-800">
          <div className="mb-4 text-6xl">
            <IconTrophy className="mx-auto h-16 w-16 text-amber-500" />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white">挑战完成！</h2>
          <div className="mb-6 space-y-2">
            <p className="text-4xl font-bold text-indigo-600">{score} 分</p>
            <p className="text-gray-500 dark:text-gray-400">
              完成 {currentIndex}/{CHALLENGE_WORD_COUNT} 个单词
            </p>
            <p className="text-gray-500 dark:text-gray-400">正确率 {accuracy}%</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="rounded-xl bg-indigo-500 px-6 py-3 font-bold text-white transition-all hover:bg-indigo-600"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  // Playing state
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Timer and Score */}
      <div className="mb-8 flex w-full max-w-md items-center justify-between">
        <div
          className={`flex items-center gap-2 rounded-full px-4 py-2 font-bold ${
            timeLeft <= 10 ? 'animate-pulse bg-red-500 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-white'
          }`}
        >
          <IconClock className="h-5 w-5" />
          <span>{formatTime(timeLeft)}</span>
        </div>
        <div className="text-lg text-gray-500 dark:text-gray-400">
          {currentIndex + 1}/{CHALLENGE_WORD_COUNT}
        </div>
        <div className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 font-bold text-white">{score} 分</div>
      </div>

      {/* Word Display */}
      <div className="mb-6 text-center">
        {/* Play button */}
        <button
          onClick={() => playWord()}
          className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500 text-4xl text-white shadow-lg transition-all hover:scale-105 hover:bg-indigo-600 active:scale-95"
        >
          🔊
        </button>
        <p className="text-sm text-gray-400">点击播放发音</p>
      </div>

      {/* Chinese meaning */}
      <div className="mb-6 text-center">
        <p className="text-2xl font-bold text-gray-700 dark:text-gray-200">{currentWord?.trans?.[0] || ''}</p>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <input
          ref={inputRef}
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="输入单词并回车..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className={`w-full rounded-xl border-2 px-6 py-4 text-center text-2xl font-bold outline-none transition-all ${
            isCorrect === true
              ? 'border-green-500 bg-green-50 text-green-600'
              : isCorrect === false
              ? 'border-red-500 bg-red-50 text-red-600'
              : 'border-gray-200 bg-white focus:border-indigo-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
          }`}
        />
      </form>

      {/* Skip button */}
      <button onClick={handleSkip} className="mt-4 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        跳过此词
      </button>

      {/* Show correct answer on wrong */}
      {isCorrect === false && (
        <p className="mt-4 text-lg font-bold text-green-600">
          正确答案: <span className="text-indigo-600">{currentWord?.name}</span>
        </p>
      )}
    </div>
  )
}
