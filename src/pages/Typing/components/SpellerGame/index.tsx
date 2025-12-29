import { TypingContext, TypingStateActionType } from '../../store'
import useKeySounds from '@/hooks/useKeySounds'
import type { Word } from '@/typings'
import type React from 'react'
import { useContext, useEffect, useRef, useState } from 'react'
import IconBackspace from '~icons/tabler/backspace'
import IconCheck from '~icons/tabler/check'

// Utility to determine which indices to mask
const getMaskedIndices = (word: string): Set<number> => {
  const len = word.length
  const indices = new Set<number>()
  if (len <= 4) {
    // Keep 1st, mask rest
    for (let i = 1; i < len; i++) {
      // Skip spaces or non-alpha if any, though usually words are just letters
      if (/[a-zA-Z]/.test(word[i])) {
        indices.add(i)
      }
    }
  } else {
    // Keep 1st and last
    // Mask 50-60% of middle
    const middleIndices: number[] = []
    for (let i = 1; i < len - 1; i++) {
      if (/[a-zA-Z]/.test(word[i])) {
        middleIndices.push(i)
      }
    }

    // Shuffle middle indices
    for (let i = middleIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[middleIndices[i], middleIndices[j]] = [middleIndices[j], middleIndices[i]]
    }

    const countToMask = Math.floor(middleIndices.length * (0.5 + Math.random() * 0.1))
    // Ensure at least one is masked if middle exists
    const finalCount = countToMask === 0 && middleIndices.length > 0 ? 1 : countToMask

    for (let i = 0; i < finalCount; i++) {
      indices.add(middleIndices[i])
    }
  }
  return indices
}

const SpellerGame: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!
  const currentWordObj = state.chapterData.words[state.chapterData.index] as Word | undefined
  const [maskedIndices, setMaskedIndices] = useState<Set<number>>(new Set())
  const [userInputs, setUserInputs] = useState<string[]>([])
  const [isShake, setIsShake] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  // New state for shuffled letters
  const [shuffledLetters, setShuffledLetters] = useState<{ char: string; rotation: number }[]>([])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const [playKeySound, playBeepSound, playHintSound] = useKeySounds()

  // Initialize word state
  useEffect(() => {
    if (!currentWordObj) return
    const wordName = currentWordObj.name

    // Fix: Skip single-letter words (e.g. "I")
    if (wordName.length <= 1) {
      const timer = setTimeout(() => {
        dispatch({ type: TypingStateActionType.NEXT_WORD })
      }, 0)
      return () => clearTimeout(timer)
    }

    const newMasked = getMaskedIndices(wordName)
    setMaskedIndices(newMasked)

    // Pre-fill unmasked chars
    const initialInputs = wordName.split('').map((char, index) => (newMasked.has(index) ? '' : char))
    setUserInputs(initialInputs)
    setIsSuccess(false)
    setIsShake(false)

    // Generate shuffled letters necessary for the word
    // Logic: include masked letters + distractors to ensure at least 5 total
    const maskedChars = wordName.split('').filter((_, i) => newMasked.has(i))

    const lettersToUse = maskedChars.map((char) => ({
      char,
      rotation: Math.random() * 20 - 10,
    }))

    // Add distractors if fewer than 5
    const MIN_LETTERS = 5
    const distractorsNeeded = Math.max(0, MIN_LETTERS - lettersToUse.length)

    for (let i = 0; i < distractorsNeeded; i++) {
      // Generate random letter
      const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26)) // a-z
      lettersToUse.push({
        char: randomChar,
        rotation: Math.random() * 20 - 10,
      })
    }

    // Shuffle them
    setShuffledLetters(lettersToUse.sort(() => Math.random() - 0.5))

    // Auto-focus first empty slot
    // We need a slight delay or effect to ensure refs are ready
    setTimeout(() => {
      const firstEmpty = initialInputs.findIndex((c) => c === '')
      if (firstEmpty !== -1 && inputRefs.current[firstEmpty]) {
        inputRefs.current[firstEmpty]?.focus()
      }
    }, 50)
  }, [currentWordObj, dispatch])

  const handleInput = (index: number, value: string) => {
    if (!currentWordObj || isSuccess) return

    // Only allow letters
    if (!/^[a-zA-Z]$/.test(value)) return

    const newInputs = [...userInputs]
    newInputs[index] = value
    setUserInputs(newInputs)

    playKeySound()

    // Find next masked index that is empty
    let nextIndex = -1
    for (let i = index + 1; i < currentWordObj.name.length; i++) {
      if (maskedIndices.has(i)) {
        nextIndex = i
        break
      }
    }

    // If no next masked, maybe loop back to first empty masked?
    if (nextIndex === -1) {
      // Check if all filled
      const isFull = newInputs.every((c) => c !== '')
      if (isFull) {
        checkAnswer(newInputs)
      }
    } else {
      inputRefs.current[nextIndex]?.focus()
    }
  }

  const handleLetterClick = (char: string) => {
    // Find first empty masked index
    const firstEmpty = userInputs.findIndex((val, idx) => maskedIndices.has(idx) && val === '')
    if (firstEmpty !== -1) {
      handleInput(firstEmpty, char)
    }
  }

  const handleBackspace = () => {
    // Find last filled masked index (or current if focused?)
    // Simple logic: erase last filled masked char.
    // Or if we track active index, erase that?
    // Let's stick to "erase last filled" for the button.
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
      // If nothing filled, maybe focus the first masked?
      // find first masked
      const firstMasked = Array.from(maskedIndices).sort((a, b) => a - b)[0]
      if (firstMasked !== undefined) {
        inputRefs.current[firstMasked]?.focus()
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isSuccess) return

    if (e.key === 'Backspace') {
      e.preventDefault()
      const newInputs = [...userInputs]
      if (newInputs[index] !== '') {
        newInputs[index] = ''
        setUserInputs(newInputs)
      } else {
        // Move to previous masked slot
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
    }
  }

  const checkAnswer = (inputs: string[]) => {
    if (!currentWordObj) return
    const inputWord = inputs.join('')
    if (inputWord.toLowerCase() === currentWordObj.name.toLowerCase()) {
      setIsSuccess(true)
      playHintSound()
      dispatch({ type: TypingStateActionType.REPORT_CORRECT_WORD })

      setTimeout(() => {
        const isLastWord = state.chapterData.index >= state.chapterData.words.length - 1
        if (isLastWord) {
          dispatch({ type: TypingStateActionType.FINISH_CHAPTER })
        } else {
          dispatch({ type: TypingStateActionType.NEXT_WORD })
        }
      }, 1000)
    } else {
      // Wrong
      playBeepSound()
      setIsShake(true)
      setTimeout(() => setIsShake(false), 500)

      dispatch({ type: TypingStateActionType.REPORT_WRONG_WORD, payload: { letterMistake: {} } })

      // Clear wrong ones in masked slots.
      const newInputs = [...inputs]
      for (let i = 0; i < newInputs.length; i++) {
        if (maskedIndices.has(i)) {
          if (newInputs[i].toLowerCase() !== currentWordObj.name[i].toLowerCase()) {
            newInputs[i] = ''
          }
        }
      }
      setUserInputs(newInputs)
      // Focus first empty
      setTimeout(() => {
        const firstEmpty = newInputs.findIndex((c) => c === '')
        if (firstEmpty !== -1) {
          inputRefs.current[firstEmpty]?.focus()
        }
      }, 50)
    }
  }

  // Handle Global Keydown (for Virtual Keyboard or lost focus)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isSuccess || !currentWordObj) return
      // If already focused on an input, let that input handle it naturally
      if (document.activeElement?.tagName === 'INPUT') return

      const key = e.key

      // Handle Backspace
      if (key === 'Backspace') {
        // Find last filled masked index
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

      // Handle Letters
      if (/^[a-zA-Z]$/.test(key)) {
        // Find first empty masked index
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
  }, [isSuccess, currentWordObj, maskedIndices, userInputs, handleInput])

  if (!currentWordObj) return null

  // Progress
  const finishedCount = state.chapterData.index
  const totalCount = state.chapterData.words.length

  return (
    <div className="flex w-full flex-col items-center justify-center gap-8 py-10">
      {/* Progress */}
      <div className="text-xl font-bold text-gray-400 dark:text-gray-500">
        {finishedCount + 1} / {totalCount}
      </div>

      {/* Meaning - Giant */}
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
            return (
              <div key={index} className="relative">
                <input
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  value={val}
                  disabled={!isMasked || isSuccess}
                  onChange={(e) => isMasked && handleInput(index, e.target.value.slice(-1))}
                  onKeyDown={(e) => isMasked && handleKeyDown(index, e)}
                  className={`flex h-14 w-12 items-center justify-center rounded-md border-2 text-center text-3xl font-bold shadow-sm outline-none transition-all duration-200 
                                ${isSuccess ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : ''}
                                ${
                                  !isMasked
                                    ? 'border-transparent bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                                    : 'bg-white text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-gray-700 dark:text-gray-100'
                                }
                                ${
                                  isShake && val !== '' && val.toLowerCase() !== char.toLowerCase()
                                    ? 'border-red-500 bg-red-50 text-red-600'
                                    : ''
                                }
                            `}
                />
              </div>
            )
          })}

          {/* Backspace Button */}
          {!isSuccess && (
            <button
              onClick={handleBackspace}
              className="flex h-14 w-12 items-center justify-center rounded-md bg-stone-100 text-stone-500 shadow-sm transition-all hover:bg-stone-200 active:scale-95 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              title="Backspace"
            >
              <IconBackspace className="h-6 w-6" />
            </button>
          )}
        </div>

        {isSuccess && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-green-500 drop-shadow-md">
            <IconCheck className="h-32 w-32 opacity-80 animate-in zoom-in spin-in-3 duration-300" />
          </div>
        )}
      </div>

      {/* Shuffle Letters Bank */}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {shuffledLetters.map((item, i) => (
          <button
            key={`${item.char}-${i}`}
            onClick={() => handleLetterClick(item.char)}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border-2 border-indigo-200 bg-white text-xl font-bold text-indigo-600 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md active:scale-95 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-400"
            style={{
              transform: `rotate(${item.rotation}deg)`,
            }}
          >
            {item.char}
          </button>
        ))}
      </div>

      {/* Custom Global Styles for Shake Animation if not in index.css */}
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

export default SpellerGame
