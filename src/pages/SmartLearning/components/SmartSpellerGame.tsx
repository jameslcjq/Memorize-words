import useKeySounds from '@/hooks/useKeySounds'
import usePronunciationSound from '@/hooks/usePronunciation'
import type { Word } from '@/typings'
import { useSaveWordRecord } from '@/utils/db'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

// Utility to determine which indices to mask
const getMaskedIndices = (word: string): Set<number> => {
  const len = word.length
  const indices = new Set<number>()
  // Mask ALL alphabet characters
  for (let i = 0; i < len; i++) {
    if (/[a-zA-Z]/.test(word[i])) {
      indices.add(i)
    }
  }
  return indices
}

interface SmartSpellerGameProps {
  /** 当前单词 */
  word: Word
  /** 完成回调（答对） */
  onComplete: () => void
  /** 错误回调（答错） */
  onError: () => void
}

/**
 * SmartSpellerGame - 智能学习模式专用的单词填空组件
 * 基于原 SpellerGame 复制，使用回调替代 TypingContext
 */
const SmartSpellerGame: React.FC<SmartSpellerGameProps> = ({ word, onComplete, onError }) => {
  const currentWordObj = word

  const [maskedIndices, setMaskedIndices] = useState<Set<number>>(new Set())
  const [userInputs, setUserInputs] = useState<string[]>([])
  const [isSuccess, setIsSuccess] = useState(false)
  const [isShowAnswer, setIsShowAnswer] = useState(false)
  const [isShake, setIsShake] = useState(false)

  // Shuffled letters for the bottom bank
  const [shuffledLetters, setShuffledLetters] = useState<{ char: string; rotation: number; id: string }[]>([])

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ char: string; rotation: number; id: string } | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [playKeySound, playBeepSound, playHintSound] = useKeySounds()
  const { play: playWord } = usePronunciationSound(currentWordObj?.name || '')
  const playWordRef = useRef(playWord)
  useEffect(() => {
    playWordRef.current = playWord
  }, [playWord])

  // Callback refs for setTimeout
  const onCompleteRef = useRef(onComplete)
  const onErrorRef = useRef(onError)
  useEffect(() => {
    onCompleteRef.current = onComplete
    onErrorRef.current = onError
  }, [onComplete, onError])

  const saveWordRecord = useSaveWordRecord()

  // Initialize word state
  useEffect(() => {
    if (!currentWordObj) return
    const wordName = currentWordObj.name || ''

    // Skip single-letter words
    if (wordName.length <= 1) {
      const timer = setTimeout(() => {
        onCompleteRef.current()
      }, 0)
      return () => clearTimeout(timer)
    }

    const newMasked = getMaskedIndices(wordName)
    setMaskedIndices(newMasked)

    const initialInputs = wordName.split('').map((char, index) => (newMasked.has(index) ? '' : char))
    setUserInputs(initialInputs)
    setIsSuccess(false)
    setIsShowAnswer(false)
    setIsShake(false)

    // Generate shuffled letters
    const maskedChars = wordName.split('').filter((_, i) => newMasked.has(i))
    const lettersToUse = maskedChars.map((char, index) => ({
      char,
      rotation: Math.random() * 20 - 10,
      id: `masked-${index}`,
    }))

    const MIN_LETTERS = 5
    const distractorsNeeded = Math.max(0, MIN_LETTERS - lettersToUse.length)
    for (let i = 0; i < distractorsNeeded; i++) {
      const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26))
      lettersToUse.push({
        char: randomChar,
        rotation: Math.random() * 20 - 10,
        id: `distractor-${i}`,
      })
    }

    setShuffledLetters(lettersToUse.sort(() => Math.random() - 0.5))
  }, [currentWordObj?.name])

  // Auto-advance when success or show answer
  useEffect(() => {
    if (!isSuccess && !isShowAnswer) return

    const delay = isSuccess ? 1300 : 2500

    const timer = setTimeout(() => {
      onCompleteRef.current()
    }, delay)

    return () => clearTimeout(timer)
  }, [isSuccess, isShowAnswer])

  const checkAnswer = useCallback(
    (inputs: string[]) => {
      if (!currentWordObj || isSuccess || isShowAnswer) return
      const inputWord = inputs.join('')
      if (inputWord.toLowerCase() === currentWordObj.name.toLowerCase()) {
        // Correct
        setIsSuccess(true)
        playHintSound()

        saveWordRecord({
          word: currentWordObj.name,
          wrongCount: 0,
          letterTimeArray: [],
          letterMistake: {},
        })

        setTimeout(() => {
          playWordRef.current()
        }, 100)
      } else {
        // Wrong
        playBeepSound()
        setIsShake(true)
        setIsShowAnswer(true)

        const letterMistake: Record<number, string[]> = {}
        inputs.forEach((char, idx) => {
          if (char.toLowerCase() !== currentWordObj.name[idx].toLowerCase()) {
            letterMistake[idx] = [char]
          }
        })

        saveWordRecord({
          word: currentWordObj.name,
          wrongCount: 1,
          letterTimeArray: [],
          letterMistake,
        })

        // Notify error (for smart learning to handle)
        onErrorRef.current()

        playWordRef.current()
        setTimeout(() => setIsShake(false), 500)
      }
    },
    [currentWordObj, isSuccess, isShowAnswer, playBeepSound, playHintSound, saveWordRecord],
  )

  const handleInput = useCallback(
    (index: number, value: string) => {
      if (!currentWordObj || isSuccess || isShowAnswer) return
      if (!/^[a-zA-Z]$/.test(value)) return

      const newInputs = [...userInputs]
      newInputs[index] = value
      setUserInputs(newInputs)

      playKeySound()

      const isFull = newInputs.every((c) => c !== '')
      if (isFull) {
        checkAnswer(newInputs)
        return
      }

      let nextIndex = -1
      for (let i = index + 1; i < currentWordObj.name.length; i++) {
        if (maskedIndices.has(i) && newInputs[i] === '') {
          nextIndex = i
          break
        }
      }

      if (nextIndex === -1) {
        for (let i = 0; i < currentWordObj.name.length; i++) {
          if (maskedIndices.has(i) && newInputs[i] === '') {
            nextIndex = i
            break
          }
        }
      }

      if (nextIndex !== -1) {
        requestAnimationFrame(() => {
          inputRefs.current[nextIndex]?.focus()
        })
      }
    },
    [currentWordObj, isSuccess, isShowAnswer, userInputs, playKeySound, maskedIndices, checkAnswer],
  )

  const handleLetterClick = (char: string) => {
    if (isShowAnswer) return
    const firstEmpty = userInputs.findIndex((val, idx) => maskedIndices.has(idx) && val === '')
    if (firstEmpty !== -1) {
      handleInput(firstEmpty, char)
    }
  }

  const handleBackspace = () => {
    if (isShowAnswer) return
    let lastFilled = -1
    for (let i = userInputs.length - 1; i >= 0; i--) {
      if (maskedIndices.has(i) && userInputs[i] !== '') {
        lastFilled = i
        break
      }
    }

    if (lastFilled !== -1) {
      const newInputs = [...userInputs]
      newInputs[lastFilled] = ''
      setUserInputs(newInputs)
      inputRefs.current[lastFilled]?.focus()
    } else {
      const firstMasked = Array.from(maskedIndices).sort((a, b) => a - b)[0]
      if (firstMasked !== undefined) {
        inputRefs.current[firstMasked]?.focus()
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSuccess || isShowAnswer) return

    if (e.key === 'Backspace') {
      e.preventDefault()
      const newInputs = [...userInputs]
      if (newInputs[index] !== '') {
        newInputs[index] = ''
        setUserInputs(newInputs)
      } else {
        let prevIndex = -1
        for (let i = index - 1; i >= 0; i--) {
          if (maskedIndices.has(i)) {
            prevIndex = i
            break
          }
        }
        if (prevIndex !== -1) {
          inputRefs.current[prevIndex]?.focus()
        }
      }
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault()
      handleInput(index, e.key)
    }
  }

  // Global keyboard handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isSuccess || isShowAnswer || !currentWordObj) return
      if (document.activeElement?.tagName === 'INPUT') return

      const key = e.key

      if (key === 'Backspace') {
        let lastFilled = -1
        for (let i = userInputs.length - 1; i >= 0; i--) {
          if (maskedIndices.has(i) && userInputs[i] !== '') {
            lastFilled = i
            break
          }
        }

        if (lastFilled !== -1) {
          const newInputs = [...userInputs]
          newInputs[lastFilled] = ''
          setUserInputs(newInputs)
          inputRefs.current[lastFilled]?.focus()
        }
        return
      }

      if (/^[a-zA-Z]$/.test(key)) {
        let firstEmpty = -1
        for (let i = 0; i < currentWordObj.name.length; i++) {
          if (maskedIndices.has(i) && userInputs[i] === '') {
            firstEmpty = i
            break
          }
        }

        if (firstEmpty !== -1) {
          handleInput(firstEmpty, key)
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isSuccess, isShowAnswer, currentWordObj, maskedIndices, userInputs, handleInput])

  // Drag and drop handlers
  useEffect(() => {
    if (!draggedItem) return

    const handlePointerMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY })
    }

    const handlePointerUp = (e: PointerEvent) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      const target = elements.find((el) => el.hasAttribute('data-speller-index'))

      if (target) {
        const indexStr = target.getAttribute('data-speller-index')
        if (indexStr) {
          const index = parseInt(indexStr, 10)
          if (!isNaN(index)) {
            handleInput(index, draggedItem.char)
          }
        }
      }

      setDraggedItem(null)
      setDragPos(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draggedItem, handleInput])

  const dragStyle: React.CSSProperties = dragPos
    ? {
        position: 'fixed',
        left: dragPos.x,
        top: dragPos.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
      }
    : { display: 'none' }

  if (!currentWordObj) return null

  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 py-4 md:gap-6 md:py-6 lg:gap-8 lg:py-10">
      {/* Meaning */}
      <div className="text-center">
        <h1 className="text-5xl font-black text-gray-800 transition-all duration-300 dark:text-gray-100">
          {currentWordObj.trans?.[0] || 'Unknown'}
        </h1>
        {currentWordObj.trans?.length > 1 && (
          <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">{currentWordObj.trans.slice(1).join('; ')}</p>
        )}
      </div>

      {/* Speller Area */}
      <div className="relative">
        <div
          className={`flex flex-wrap items-center justify-center gap-2 transition-transform duration-300 ${isShake ? 'animate-shake' : ''}`}
        >
          {currentWordObj.name.split('').map((char, index) => {
            const isMasked = maskedIndices.has(index)
            const val = userInputs[index] || ''
            const isErrorChar = isShowAnswer && val.toLowerCase() !== char.toLowerCase()
            const isCorrectChar = isShowAnswer && val.toLowerCase() === char.toLowerCase()

            return (
              <div key={index} className="relative" data-speller-index={isMasked ? index : undefined}>
                <input
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  value={val}
                  disabled={!isMasked || isSuccess || isShowAnswer}
                  readOnly={true}
                  onKeyDown={(e) => isMasked && handleKeyDown(index, e)}
                  className={`flex h-12 w-12 appearance-none items-center justify-center rounded-md border-2 p-0 text-center font-mono text-xl font-bold shadow-sm outline-none transition-all duration-200 md:h-14 md:w-14 md:text-2xl 
                                ${isSuccess ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : ''}
                                ${
                                  !isMasked
                                    ? 'border-transparent bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                                    : 'cursor-pointer bg-white text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-gray-700 dark:text-gray-100'
                                }
                                ${isErrorChar ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-900/20' : ''}
                                ${isCorrectChar ? 'border-green-500 text-green-600 dark:text-green-400' : ''}
                            `}
                />
              </div>
            )
          })}

          {/* Backspace Button */}
          {!isSuccess && !isShowAnswer && (
            <button
              onClick={handleBackspace}
              className="flex h-12 w-12 items-center justify-center rounded-md bg-stone-100 text-stone-500 shadow-sm transition-all hover:bg-stone-200 active:scale-95 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 md:h-14 md:w-14"
              title="Backspace"
            >
              <span className="text-xl">⌫</span>
            </button>
          )}
        </div>

        {isSuccess && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-green-500 drop-shadow-md">
            <span className="text-9xl">✓</span>
          </div>
        )}

        {isShowAnswer && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 drop-shadow-md">
            <span className="text-9xl">✗</span>
          </div>
        )}

        {isShowAnswer && (
          <div className="absolute -bottom-16 left-0 right-0 animate-bounce text-center">
            <span className="rounded bg-white px-4 py-2 text-2xl font-bold text-green-600 shadow dark:bg-gray-800 dark:text-green-400">
              {currentWordObj.name}
            </span>
          </div>
        )}
      </div>

      {/* Shuffle Letters Bank */}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {shuffledLetters.map((item, i) => (
          <button
            key={`${item.char}-${i}`}
            onClick={() => handleLetterClick(item.char)}
            onPointerDown={(e) => {
              if (isShowAnswer) return
              const box = e.currentTarget.getBoundingClientRect()
              setDraggedItem(item)
              setDragPos({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
            }}
            className={`flex h-14 w-14 cursor-grab touch-none items-center justify-center rounded-lg border-2 border-indigo-200 bg-white font-mono text-xl font-bold text-indigo-600 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md active:scale-95 active:cursor-grabbing dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-400 md:h-12 md:w-12
             ${isShowAnswer ? 'cursor-not-allowed opacity-50' : ''}
            `}
            style={{
              transform: `rotate(${item.rotation}deg)`,
              opacity: draggedItem?.id === item.id ? 0.4 : isShowAnswer ? 0.5 : 1,
            }}
            disabled={isShowAnswer}
          >
            {item.char}
          </button>
        ))}
      </div>

      {/* Dragged Ghost */}
      {draggedItem && dragPos && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-indigo-400 bg-indigo-50 text-xl font-bold text-indigo-700 shadow-xl dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100"
          style={dragStyle}
        >
          {draggedItem.char}
        </div>
      )}

      {/* Shake Animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  )
}

export default SmartSpellerGame
