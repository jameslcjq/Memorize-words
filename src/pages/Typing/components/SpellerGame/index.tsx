import useKeySounds from '@/hooks/useKeySounds'
import usePronunciationSound from '@/hooks/usePronunciation'
import { TypingContext, TypingStateActionType } from '@/pages/Typing/store'
import type { Word } from '@/typings'
import { useSaveWordRecord } from '@/utils/db'
import type React from 'react'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'

// import IconBackspace from '~icons/tabler/backspace'
// import IconCheck from '~icons/tabler/check'

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

const SpellerGame: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { state, dispatch } = useContext(TypingContext)!
  const currentWordObj = state.chapterData.words[state.chapterData.index] as Word | undefined

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

  const saveWordRecord = useSaveWordRecord()

  // Initialize word state
  useEffect(() => {
    if (!currentWordObj) return
    const wordName = currentWordObj.name || ''

    // Fix: Skip single-letter words (e.g. "I")
    if (wordName.length <= 1) {
      const timer = setTimeout(() => {
        dispatch({ type: TypingStateActionType.NEXT_WORD })
      }, 0)
      return () => clearTimeout(timer)
    }

    const newMasked = getMaskedIndices(wordName)
    setMaskedIndices(newMasked)

    // Pre-fill unmasked chars (usually none now, unless spaces/punctuation)
    const initialInputs = wordName.split('').map((char, index) => (newMasked.has(index) ? '' : char))
    setUserInputs(initialInputs)
    setIsSuccess(false)
    setIsShowAnswer(false)
    setIsShake(false)

    // Generate shuffled letters necessary for the word
    // Logic: include masked letters + distractors to ensure at least 5 total
    const maskedChars = wordName.split('').filter((_, i) => newMasked.has(i))

    const lettersToUse = maskedChars.map((char, index) => ({
      char,
      rotation: Math.random() * 20 - 10,
      id: `masked-${index}`,
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
        id: `distractor-${i}`,
      })
    }

    // Shuffle them
    setShuffledLetters(lettersToUse.sort(() => Math.random() - 0.5))

    // Auto-focus first empty slot
    setTimeout(() => {
      const firstEmpty = initialInputs.findIndex((c) => c === '')
      if (firstEmpty !== -1 && inputRefs.current[firstEmpty]) {
        inputRefs.current[firstEmpty]?.focus()
      }
    }, 100)
  }, [currentWordObj, dispatch])

  const checkAnswer = useCallback(
    (inputs: string[]) => {
      if (!currentWordObj) return
      const inputWord = inputs.join('')
      if (inputWord.toLowerCase() === currentWordObj.name.toLowerCase()) {
        // Correct
        setIsSuccess(true)
        playHintSound()
        dispatch({ type: TypingStateActionType.REPORT_CORRECT_WORD })

        // Play Pronunciation
        playWord()

        setTimeout(() => {
          const isLastWord = state.chapterData.index >= state.chapterData.words.length - 1
          if (isLastWord) {
            dispatch({ type: TypingStateActionType.FINISH_CHAPTER })
          } else {
            dispatch({ type: TypingStateActionType.NEXT_WORD })
          }
        }, 1000)
      } else {
        // Wrong -> Fail Fast
        playBeepSound()
        setIsShake(true)
        setIsShowAnswer(true) // Show correct answer

        // Record Error
        const letterMistake: any = {}
        // Basic diff for mistakes
        inputs.forEach((char, idx) => {
          if (char.toLowerCase() !== currentWordObj.name[idx].toLowerCase()) {
            letterMistake[idx] = 1
          }
        })

        dispatch({ type: TypingStateActionType.REPORT_WRONG_WORD, payload: { letterMistake } })

        // Save to error book (IndexedDB)
        saveWordRecord({
          word: currentWordObj.name,
          wrongCount: 1, // At least 1 wrong
          letterTimeArray: [],
          letterMistake,
        })

        playWord() // Play sound of correct word so they know what it was

        setTimeout(() => setIsShake(false), 500)

        // Move to next word after delay
        setTimeout(() => {
          const isLastWord = state.chapterData.index >= state.chapterData.words.length - 1
          if (isLastWord) {
            dispatch({ type: TypingStateActionType.FINISH_CHAPTER })
          } else {
            dispatch({ type: TypingStateActionType.NEXT_WORD })
          }
        }, 2500) // 2.5s delay to read correct answer
      }
    },
    [
      currentWordObj,
      dispatch,
      playBeepSound,
      playHintSound,
      state.chapterData.index,
      state.chapterData.words.length,
      playWord,
      saveWordRecord,
    ],
  )

  const handleInput = useCallback(
    (index: number, value: string) => {
      if (!currentWordObj || isSuccess || isShowAnswer) return

      // Only allow letters
      if (!/^[a-zA-Z]$/.test(value)) return

      const newInputs = [...userInputs]
      newInputs[index] = value
      setUserInputs(newInputs)

      playKeySound()

      // 1. Check if full logic (Fail fast or Success)
      // Check if all filled by checking the newInputs array
      const isFull = newInputs.every((c) => c !== '')
      if (isFull) {
        // If full, check answer immediately
        checkAnswer(newInputs)
        return
      }

      // 2. Focus next empty manually
      let nextIndex = -1
      for (let i = index + 1; i < currentWordObj.name.length; i++) {
        if (maskedIndices.has(i) && newInputs[i] === '') {
          nextIndex = i
          break
        }
      }

      // If we didn't find one forward, maybe search from start? (Though usually we fill linear)
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
    // Find first empty masked index
    const firstEmpty = userInputs.findIndex((val, idx) => maskedIndices.has(idx) && val === '')
    if (firstEmpty !== -1) {
      handleInput(firstEmpty, char)
    }
  }

  const handleBackspace = () => {
    if (isShowAnswer) return
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
    } else {
      // If nothing filled, maybe focus the first masked?
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
        // Keep focus here? Or move back?
        // Usually backspace clears current, stays here.
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
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      // Handle letter input manually since inputs are read-only
      e.preventDefault()
      handleInput(index, e.key)
    }
  }

  // Handle Global Keydown (for Virtual Keyboard or lost focus)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isSuccess || isShowAnswer || !currentWordObj) return
      // If already focused on an input, let that input handle it naturally
      if (document.activeElement?.tagName === 'INPUT') return

      const key = e.key

      // Handle Backspace
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
  }, [isSuccess, isShowAnswer, currentWordObj, maskedIndices, userInputs, handleInput])

  // Handle Global Drag Events
  useEffect(() => {
    if (!draggedItem) return

    const handlePointerMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY })
    }

    const handlePointerUp = (e: PointerEvent) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      // Find dropped target
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

  // Custom styles for dragged item
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
            // If showing answer, show correct char. Otherwise user input.
            const val = isShowAnswer ? char : userInputs[index] || ''

            return (
              <div
                key={index}
                className="relative"
                data-speller-index={isMasked ? index : undefined} // Helper for dropping
              >
                <input
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  value={val}
                  disabled={!isMasked || isSuccess || isShowAnswer}
                  readOnly={true} // Disable system keyboard
                  // onChange removed, using onKeyDown manual handling
                  onKeyDown={(e) => isMasked && handleKeyDown(index, e)}
                  onFocus={() => {
                    // Attempt to hide keyboard if readOnly doesn't suffice on some weird browsers
                  }}
                  className={`flex h-14 w-14 appearance-none items-center justify-center rounded-md border-2 p-0 text-center text-2xl font-bold shadow-sm outline-none transition-all duration-200 
                                ${isSuccess ? 'border-green-500 bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' : ''}
                                ${
                                  !isMasked
                                    ? 'border-transparent bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                                    : 'cursor-pointer bg-white text-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:bg-gray-700 dark:text-gray-100'
                                }
                                ${isShowAnswer ? 'border-red-500 bg-red-50 text-red-600 dark:bg-red-900/20' : ''}
                            `}
                />
              </div>
            )
          })}

          {/* Backspace Button */}
          {!isSuccess && !isShowAnswer && (
            <button
              onClick={handleBackspace}
              className="flex h-14 w-12 items-center justify-center rounded-md bg-stone-100 text-stone-500 shadow-sm transition-all hover:bg-stone-200 active:scale-95 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
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
      </div>

      {/* Shuffle Letters Bank */}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        {shuffledLetters.map((item, i) => (
          <button
            key={`${item.char}-${i}`}
            // Handle Click
            onClick={() => handleLetterClick(item.char)}
            // Handle Drag
            onPointerDown={(e) => {
              if (isShowAnswer) return
              // Prevent default touch actions
              const box = e.currentTarget.getBoundingClientRect()
              setDraggedItem(item)
              setDragPos({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
            }}
            className={`flex h-12 w-12 cursor-grab touch-none items-center justify-center rounded-lg border-2 border-indigo-200 bg-white text-xl font-bold text-indigo-600 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md active:scale-95 active:cursor-grabbing dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-400
             ${isShowAnswer ? 'cursor-not-allowed opacity-50' : ''}
            `}
            style={{
              transform: `rotate(${item.rotation}deg)`,
              opacity: draggedItem?.id === item.id ? 0.4 : isShowAnswer ? 0.5 : 1, // visual feedback
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

      {/* Custom Global Styles for Shake Animation */}
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
