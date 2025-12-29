import { TypingContext } from '../../store'
import useKeySounds from '@/hooks/useKeySounds'
import type { Word } from '@/typings'
import type { CrosswordData } from '@/utils/crosswordLayout'
import { CrosswordGenerator } from '@/utils/crosswordLayout'
import confetti from 'canvas-confetti'
import type React from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import IconCheck from '~icons/tabler/check'
import IconLetterCase from '~icons/tabler/letter-case'
import IconRefresh from '~icons/tabler/refresh'
import IconTrophy from '~icons/tabler/trophy'

const LEVELS = {
  1: { name: '入门', count: 3 },
  2: { name: '进阶', count: 6 },
  3: { name: '挑战', count: 12 },
}

// Cell state for rendering
interface CellState {
  x: number
  y: number
  char: string // Actual answer (always saved as is from word, usually lowercase in source?) -> We normalize to Upper for comparison
  userInput: string
  isHint: boolean // Was this pre-filled?
  wordIds: string[] // Words this cell belongs to
  isStartOf?: string // Is this the start of a word (store ID)?
}

const CELL_SIZE = 54
const GRID_PADDING = 40

const CrosswordGame: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { state } = useContext(TypingContext)!
  const [level, setLevel] = useState<1 | 2 | 3>(1)
  const [gridData, setGridData] = useState<CrosswordData | null>(null)
  const [cells, setCells] = useState<Record<string, CellState>>({})
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null)
  const [solvedWordIds, setSolvedWordIds] = useState<Set<string>>(new Set())
  const [showVictory, setShowVictory] = useState(false)
  const [isUpperCase, setIsUpperCase] = useState(false)
  const [scale, setScale] = useState(1)
  const [theme, setTheme] = useState<'beige' | 'blue' | 'gray'>('beige')
  const [activeCell, setActiveCell] = useState<{ x: number; y: number } | null>(null)
  const [shuffledLetters, setShuffledLetters] = useState<{ char: string; rotation: number; id: number }[]>([])

  // Drag State
  const [draggedItem, setDraggedItem] = useState<{ char: string; id: number } | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)

  const THEMES = {
    beige: { name: '羊皮纸', value: '#e8e4c9', border: 'border-stone-300' },
    blue: { name: '护眼蓝', value: '#e0f2fe', border: 'border-sky-200' },
    gray: { name: '极简灰', value: '#f3f4f6', border: 'border-gray-200' },
  }

  // Sounds
  const [playKeySound, , playHintSound] = useKeySounds()

  const generator = useMemo(() => new CrosswordGenerator(), [])
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  // Fit grid to container
  useEffect(() => {
    if (!gridData || !containerRef.current) return

    const { width: containerW, height: containerH } = containerRef.current.getBoundingClientRect()
    const gridW = gridData.width * CELL_SIZE + GRID_PADDING * 2
    const gridH = gridData.height * CELL_SIZE + GRID_PADDING * 2

    const scaleW = containerW / gridW
    const scaleH = containerH / gridH

    // Take smaller scale to fit, max at 1.2 for "big" feeling but not absurd
    const newScale = Math.min(scaleW, scaleH, 1.2)
    setScale(newScale)
  }, [gridData, containerRef.current?.offsetWidth, containerRef.current?.offsetHeight]) // Basic response to resize

  // Generate Level
  const generateLevel = useCallback(() => {
    const words = (state.chapterData.words as Word[]).filter((w) => w.name.length > 1)
    if (words.length === 0) return

    const count = LEVELS[level].count
    // Random pick
    const shuffled = [...words].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, count)

    const data = generator.generate(selected)
    if (!data) return // Failed to generate

    setGridData(data)

    // Build Cell Map
    const newCells: Record<string, CellState> = {}

    data.words.forEach((w) => {
      const dx = w.direction === 'across' ? 1 : 0
      const dy = w.direction === 'across' ? 0 : 1

      for (let i = 0; i < w.word.length; i++) {
        const x = w.x + i * dx
        const y = w.y + i * dy
        const key = `${x},${y}`

        if (!newCells[key]) {
          const isHint = Math.random() < 0.35
          newCells[key] = {
            x,
            y,
            char: w.word[i],
            userInput: isHint ? w.word[i] : '',
            isHint,
            wordIds: [],
            isStartOf: undefined,
          }
        }
        newCells[key].wordIds.push(w.id)
        if (i === 0) newCells[key].isStartOf = w.id
      }
    })

    setCells(newCells)
    setSolvedWordIds(new Set())
    setShowVictory(false)
    setSelectedWordId(data.words[0].id)
  }, [level, state.chapterData.words, generator])

  useEffect(() => {
    generateLevel()
  }, [generateLevel])

  // Generate scrambled letters for the selected word
  const prevSelectedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedWordId || !gridData) return

    // Avoid re-shuffling when typing (cells change)
    if (selectedWordId === prevSelectedRef.current && shuffledLetters.length > 0) return
    prevSelectedRef.current = selectedWordId

    const wordObj = gridData.words.find((w) => w.id === selectedWordId)
    if (!wordObj) return

    const dx = wordObj.direction === 'across' ? 1 : 0
    const dy = wordObj.direction === 'across' ? 0 : 1
    const newLetters: { char: string; rotation: number; id: number }[] = []

    for (let i = 0; i < wordObj.word.length; i++) {
      const x = wordObj.x + i * dx
      const y = wordObj.y + i * dy
      const key = `${x},${y}`
      const cell = cells[key]

      // Only include if not hint
      if (cell && !cell.isHint) {
        newLetters.push({
          char: cell.char,
          rotation: Math.random() * 20 - 10,
          id: i,
        })
      }
    }

    // Add distractors if fewer than 5
    const MIN_LETTERS = 5
    const distractorsNeeded = Math.max(0, MIN_LETTERS - newLetters.length)

    for (let i = 0; i < distractorsNeeded; i++) {
      // Generate random letter
      const randomChar = String.fromCharCode(97 + Math.floor(Math.random() * 26)) // a-z
      newLetters.push({
        char: randomChar,
        rotation: Math.random() * 20 - 10,
        id: 100 + i, // safe fake id
      })
    }

    setShuffledLetters(newLetters.sort(() => Math.random() - 0.5))
  }, [selectedWordId, gridData, cells, shuffledLetters.length])

  const handleLetterClick = (char: string) => {
    if (!selectedWordId || !gridData) return

    const wordObj = gridData.words.find((w) => w.id === selectedWordId)
    if (!wordObj) return

    const dx = wordObj.direction === 'across' ? 1 : 0
    const dy = wordObj.direction === 'across' ? 0 : 1

    // Find first empty cell in the selected word (or current active if empty?)
    // Let's iterate through the word and find first empty non-hint cell.
    let targetX = -1
    let targetY = -1

    // Check if active cell is empty and in current word
    if (activeCell) {
      const { x, y } = activeCell
      const key = `${x},${y}`
      // Verify if active cell belongs to current word
      // Simple check: is it on the line?
      let isJoin = false
      for (let i = 0; i < wordObj.word.length; i++) {
        if (wordObj.x + i * dx === x && wordObj.y + i * dy === y) {
          isJoin = true
          break
        }
      }

      if (isJoin && cells[key] && !cells[key].isHint && cells[key].userInput === '') {
        targetX = x
        targetY = y
      }
    }

    // If active cell wasn't suitable, find first empty
    if (targetX === -1) {
      for (let i = 0; i < wordObj.word.length; i++) {
        const x = wordObj.x + i * dx
        const y = wordObj.y + i * dy
        const key = `${x},${y}`
        if (cells[key] && !cells[key].isHint && cells[key].userInput === '') {
          targetX = x
          targetY = y
          break
        }
      }
    }

    if (targetX !== -1) {
      handleInput(targetX, targetY, char)
    }
  }

  // TTS
  const speakWord = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }

  // Check Word Completion
  const checkWord = useCallback(
    (wordId: string, currentCells: Record<string, CellState>) => {
      if (!gridData || solvedWordIds.has(wordId)) return

      const wordObj = gridData.words.find((w) => w.id === wordId)
      if (!wordObj) return

      const dx = wordObj.direction === 'across' ? 1 : 0
      const dy = wordObj.direction === 'across' ? 0 : 1

      let isCorrect = true

      for (let i = 0; i < wordObj.word.length; i++) {
        const key = `${wordObj.x + i * dx},${wordObj.y + i * dy}`
        const cell = currentCells[key]
        if (!cell || cell.userInput === '') {
          isCorrect = false
          break
        }
        if (cell.userInput.toUpperCase() !== cell.char.toUpperCase()) {
          isCorrect = false
        }
      }

      if (isCorrect) {
        setSolvedWordIds((prev) => {
          const next = new Set(prev)
          next.add(wordId)
          return next
        })
        playHintSound()
        // Optional: Speak prompt or word? Maybe word.
        speakWord(wordObj.word)

        // Check victory
        const totalWords = gridData.words.length
        // Check if all correct (we need to be careful with async state, but localized is fine)
        // A safer check is if new size == total
        // solvedWordIds is stale here inside callback if we use the state directly, but we are using setter.
        // But for victory check we need the NEW size.
        // We can't see the new size immediately.
        // We can recalculate based on prev size? No, `solvedWordIds` is from closure.
        // Better strategy: Check against `solvedWordIds.size + 1` assuming it wasn't there (we checked has(wordId) at start).

        if (solvedWordIds.size + 1 === totalWords) {
          setShowVictory(true)
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
          })
        }
      }
    },
    [gridData, solvedWordIds, playHintSound],
  )

  const handleCellClick = (x: number, y: number) => {
    const key = `${x},${y}`
    const cell = cells[key]
    if (!cell) return

    // Toggle selection between intersecting words if clicking active cell
    if (selectedWordId && cell.wordIds.includes(selectedWordId)) {
      const currentIdx = cell.wordIds.indexOf(selectedWordId!)
      const nextId = cell.wordIds[(currentIdx + 1) % cell.wordIds.length]
      setSelectedWordId(nextId)
    } else {
      // Pick first associated word
      setSelectedWordId(cell.wordIds[0])
    }

    // Focus input
    setActiveCell({ x, y })
    setTimeout(() => inputRefs.current[key]?.focus(), 0)
  }

  const handleInput = useCallback(
    (x: number, y: number, val: string) => {
      const key = `${x},${y}`
      if (!cells[key] || cells[key].isHint) return // Can't edit hints

      // Allow letters only
      if (!/^[a-zA-Z]$/.test(val) && val !== '') return

      const newCells = { ...cells }
      // Store as raw input (case insensitive logic handles check)
      // But we display based on isUpperCase state
      newCells[key] = { ...newCells[key], userInput: val }
      setCells(newCells)

      if (val !== '') {
        playKeySound()
        // Check if this input completed any words
        const cell = newCells[key]
        cell.wordIds.forEach((wid) => checkWord(wid, newCells))

        // Auto-move cursor to next editable cell
        if (selectedWordId) {
          const wordObj = gridData?.words.find((w) => w.id === selectedWordId)
          if (wordObj) {
            const dx = wordObj.direction === 'across' ? 1 : 0
            const dy = wordObj.direction === 'across' ? 0 : 1

            // Find index of current cell in word
            let idx = -1
            for (let i = 0; i < wordObj.word.length; i++) {
              if (wordObj.x + i * dx === x && wordObj.y + i * dy === y) {
                idx = i
                break
              }
            }

            // Look for next editable cell
            let nextIdx = -1
            for (let i = idx + 1; i < wordObj.word.length; i++) {
              const nextX = wordObj.x + i * dx
              const nextY = wordObj.y + i * dy
              const nextKey = `${nextX},${nextY}`
              const nextCell = newCells[nextKey]
              // Skip if hint
              if (nextCell && !nextCell.isHint && !solvedWordIds.has(selectedWordId)) {
                nextIdx = i
                break
              }
            }

            if (nextIdx !== -1) {
              const nextX = wordObj.x + nextIdx * dx
              const nextY = wordObj.y + nextIdx * dy
              const nextKey = `${nextX},${nextY}`
              inputRefs.current[nextKey]?.focus()
            }
          }
        }
      }
    },
    [cells, gridData, selectedWordId, solvedWordIds, playKeySound, checkWord],
  )
  // Ideally checkWord should be useCallback too OR included.
  // We can include checkWord in deps if we make checkWord stable or just suppress warning if we accept re-creation.
  // Actually, checkWord is not stable. Let's make it stable too or just leave it.
  // In this simple edit, I will just leave checkWord implicitly captured if I don't use useCallback, OR I update checkWord.
  // To avoid complexity, I'll update checkWord to be useCallback first in a separate chunk or just inline the dependency.
  // Actually, let's wrap checkWord in useCallback too.

  const handleKeyDown = (e: React.KeyboardEvent, x: number, y: number) => {
    if (e.key === 'Backspace') {
      const key = `${x},${y}`
      if (!cells[key].isHint && cells[key].userInput !== '') {
        // Clear current
        const newCells = { ...cells }
        newCells[key] = { ...newCells[key], userInput: '' }
        setCells(newCells)
      } else {
        // Move back
        if (selectedWordId) {
          const wordObj = gridData?.words.find((w) => w.id === selectedWordId)
          if (wordObj) {
            const dx = wordObj.direction === 'across' ? 1 : 0
            const dy = wordObj.direction === 'across' ? 0 : 1
            // Find index
            let idx = -1
            for (let i = 0; i < wordObj.word.length; i++) {
              if (wordObj.x + i * dx === x && wordObj.y + i * dy === y) {
                idx = i
                break
              }
            }
            if (idx > 0) {
              const prevX = wordObj.x + (idx - 1) * dx
              const prevY = wordObj.y + (idx - 1) * dy
              const prevKey = `${prevX},${prevY}`
              inputRefs.current[prevKey]?.focus()
            }
          }
        }
      }
    } else if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault()
      handleInput(x, y, e.key)
    }
  }

  // Global Drag Events
  useEffect(() => {
    if (!draggedItem) return

    const handlePointerMove = (e: PointerEvent) => {
      setDragPos({ x: e.clientX, y: e.clientY })
    }

    const handlePointerUp = (e: PointerEvent) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY)
      // Find dropped target by data attributes
      const target = elements.find((el) => el.hasAttribute('data-crossword-x'))

      if (target) {
        const xStr = target.getAttribute('data-crossword-x')
        const yStr = target.getAttribute('data-crossword-y')

        if (xStr && yStr) {
          const x = parseInt(xStr, 10)
          const y = parseInt(yStr, 10)
          if (!isNaN(x) && !isNaN(y)) {
            // Ensure valid cell
            handleInput(x, y, draggedItem.char)
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

  // Custom Drag Style
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

  // Global Keydown for Virtual Keyboard
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!gridData || !activeCell) return
      if (document.activeElement?.tagName === 'INPUT') return

      const { x, y } = activeCell
      const key = e.key

      if (/^[a-zA-Z]$/.test(key)) {
        handleInput(x, y, key)
      } else if (key === 'Backspace') {
        const cellKey = `${x},${y}`
        if (cells[cellKey] && !cells[cellKey].isHint && cells[cellKey].userInput !== '') {
          // Clear
          const newCells = { ...cells }
          newCells[cellKey] = { ...newCells[cellKey], userInput: '' }
          setCells(newCells)
        } else {
          // Move back
          if (selectedWordId) {
            const wordObj = gridData?.words.find((w) => w.id === selectedWordId)
            if (wordObj) {
              const dx = wordObj.direction === 'across' ? 1 : 0
              const dy = wordObj.direction === 'across' ? 0 : 1
              let idx = -1
              for (let i = 0; i < wordObj.word.length; i++) {
                if (wordObj.x + i * dx === x && wordObj.y + i * dy === y) {
                  idx = i
                  break
                }
              }
              if (idx > 0) {
                const prevX = wordObj.x + (idx - 1) * dx
                const prevY = wordObj.y + (idx - 1) * dy
                setActiveCell({ x: prevX, y: prevY })
                // Optionally focus, but we want to support VK without stealing focus back if relying on activeCell
              }
            }
          }
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [gridData, activeCell, cells, selectedWordId, handleInput])

  if (!gridData)
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="animate-pulse text-xl text-gray-500">正在生成填字游戏...</div>
      </div>
    )

  const selectedWord = gridData.words.find((w) => w.id === selectedWordId)

  return (
    <div className="flex h-full w-full flex-col items-center overflow-hidden bg-transparent dark:bg-transparent">
      {/* Control Bar */}
      <div className="mb-4 flex w-full max-w-5xl items-center justify-between rounded-lg bg-white p-3 shadow-sm dark:bg-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="mr-2 font-bold text-gray-700 dark:text-gray-200">难度:</span>
            <div className="flex rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
              {Object.entries(LEVELS).map(([k, v]) => {
                const levelKey = Number(k) as 1 | 2 | 3
                const isActive = level === levelKey
                return (
                  <button
                    key={k}
                    onClick={() => setLevel(levelKey)}
                    className={`rounded-md px-3 py-1 text-sm transition-all ${
                      isActive
                        ? 'bg-white font-bold text-indigo-600 shadow-sm dark:bg-gray-600 dark:text-white'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {v.name}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 border-l pl-4 dark:border-gray-700">
            <span className="mr-2 font-bold text-gray-700 dark:text-gray-200">背景:</span>
            <div className="flex gap-2">
              {Object.entries(THEMES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setTheme(k as any)}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${
                    theme === k ? 'scale-110 border-indigo-500 shadow-sm' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: v.value }}
                  title={v.name}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="text-xl font-bold text-stone-600 dark:text-stone-300">
          已解锁: {solvedWordIds.size} / {gridData.words.length}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsUpperCase(!isUpperCase)}
            className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-gray-600 transition hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300"
            title="切换大小写"
          >
            <IconLetterCase /> {isUpperCase ? '大写' : '小写'}
          </button>
          <button
            onClick={generateLevel}
            className="flex items-center gap-2 rounded-md bg-indigo-50 px-4 py-2 text-indigo-600 transition hover:bg-indigo-100 dark:bg-gray-700 dark:text-indigo-400"
          >
            <IconRefresh /> 新游戏
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full max-w-6xl flex-1 gap-6 overflow-hidden">
        {/* Grid Area - Auto-Scaled, No Scrollbars */}
        <div
          ref={containerRef}
          className={`relative flex-1 overflow-hidden rounded-xl border-4 ${THEMES[theme].border} flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] transition-colors duration-500 dark:border-gray-700 dark:bg-gray-800`}
          style={{ backgroundColor: THEMES[theme].value }}
        >
          <div
            className="relative origin-center transition-transform duration-300 ease-out"
            style={{
              width: gridData.width * CELL_SIZE,
              height: gridData.height * CELL_SIZE,
              transform: `scale(${scale})`,
            }}
          >
            {Object.values(cells).map((cell) => {
              const isSelected = selectedWordId && cell.wordIds.includes(selectedWordId)
              const isSolved = cell.wordIds.some((id) => solvedWordIds.has(id))
              const key = `${cell.x},${cell.y}`

              // Display logic
              const displayChar = isUpperCase ? cell.userInput.toUpperCase() : cell.userInput.toLowerCase()

              return (
                <div
                  key={key}
                  // ADDED for drop logic
                  data-crossword-x={cell.x}
                  data-crossword-y={cell.y}
                  className={`absolute flex h-[${CELL_SIZE - 4}px] w-[${
                    CELL_SIZE - 4
                  }px] items-center justify-center rounded-md border-2 text-2xl font-bold shadow-sm transition-all duration-200
                                        ${
                                          cell.isHint
                                            ? 'bg-stone-200 text-stone-500 dark:bg-gray-700 dark:text-gray-500'
                                            : 'bg-white text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                                        }
                                        ${
                                          isSelected ? 'z-10 ring-2 ring-indigo-400 ring-offset-1' : 'border-stone-400 dark:border-gray-500'
                                        }
                                        ${isSolved ? '!border-green-400 !bg-green-100 !text-green-600 dark:!bg-green-900/30' : ''}
                                    `}
                  onClick={() => handleCellClick(cell.x, cell.y)}
                  // Set fixed sizes explicitly via style to avoid tailwind purge issues with dynamic values if any
                  style={{
                    left: cell.x * CELL_SIZE,
                    top: cell.y * CELL_SIZE,
                    width: CELL_SIZE - 4,
                    height: CELL_SIZE - 4,
                  }}
                >
                  <input
                    ref={(el) => (inputRefs.current[key] = el)}
                    className="h-full w-full cursor-default bg-transparent text-center outline-none"
                    value={displayChar}
                    readOnly={true} // Disable system keyboard
                    // removed onChange, use onKeyDown
                    onKeyDown={(e) => handleKeyDown(e, cell.x, cell.y)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex w-72 flex-col gap-4">
          {/* Current Clue Card */}
          <div className="rounded-xl bg-white p-6 shadow-md transition-all dark:bg-gray-800">
            <div className="mb-2 text-sm font-bold uppercase text-indigo-500">当前提示</div>
            {selectedWord ? (
              <div>
                <h3 className="mb-2 text-xl font-black text-gray-800 dark:text-gray-100">
                  {selectedWord.direction === 'across' ? '横向' : '纵向'}
                </h3>
                <p className="text-lg text-gray-600 dark:text-gray-300">{selectedWord.clue}</p>
              </div>
            ) : (
              <div className="italic text-gray-400">点击方格选择单词</div>
            )}
          </div>

          {/* Word List */}
          <div className="flex-1 overflow-auto rounded-xl bg-white p-4 shadow-md dark:bg-gray-800">
            <h4 className="sticky top-0 mb-4 border-b bg-white pb-2 font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              单词列表
            </h4>
            <div className="space-y-2">
              {gridData.words.map((w) => {
                const isSolved = solvedWordIds.has(w.id)
                const isSel = selectedWordId === w.id
                const displayWord = isUpperCase ? w.word.toUpperCase() : w.word.toLowerCase()

                return (
                  <div
                    key={w.id}
                    onClick={() => {
                      setSelectedWordId(w.id)
                      const key = `${w.x},${w.y}`
                      inputRefs.current[key]?.focus()
                    }}
                    className={`cursor-pointer rounded-lg border p-3 transition-all
                                            ${
                                              isSel
                                                ? 'border-indigo-200 bg-indigo-50 dark:border-gray-600 dark:bg-gray-700'
                                                : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }
                                        `}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${isSolved ? 'text-green-500 line-through opacity-60' : 'text-gray-500'}`}>
                        {w.direction === 'across' ? '横' : '竖'}
                      </span>
                      {isSolved && <IconCheck className="text-green-500" />}
                    </div>
                    <div className={`mt-1 font-medium ${isSolved ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                      {isSolved ? displayWord : w.clue}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Shuffled Letters Bank */}
          {selectedWordId && (
            <div className="rounded-xl bg-white p-4 shadow-md dark:bg-gray-800">
              <div className="mb-2 text-sm font-bold uppercase text-indigo-500">拼写字母</div>
              <div className="flex flex-wrap justify-center gap-3">
                {shuffledLetters.map((item, i) => (
                  <button
                    key={`${item.char}-${i}-${item.id}`}
                    onClick={() => handleLetterClick(item.char)}
                    onPointerDown={(e) => {
                      const box = e.currentTarget.getBoundingClientRect()
                      setDraggedItem(item)
                      setDragPos({ x: box.left + box.width / 2, y: box.top + box.height / 2 })
                    }}
                    className="flex h-10 w-10 cursor-grab items-center justify-center rounded-lg border-2 border-indigo-200 bg-white text-lg font-bold text-indigo-600 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-md active:scale-95 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-indigo-400"
                    style={{
                      transform: `rotate(${item.rotation}deg)`,
                      opacity: draggedItem?.id === item.id ? 0.4 : 1,
                    }}
                  >
                    {isUpperCase ? item.char.toUpperCase() : item.char.toLowerCase()}
                  </button>
                ))}
                {shuffledLetters.length === 0 && <span className="text-sm text-gray-400">无需填写</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drag Ghost for Crossword */}
      {draggedItem && dragPos && (
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-indigo-400 bg-indigo-50 text-lg font-bold text-indigo-700 shadow-xl dark:border-gray-500 dark:bg-gray-800 dark:text-gray-100"
          style={dragStyle}
        >
          {isUpperCase ? draggedItem.char.toUpperCase() : draggedItem.char.toLowerCase()}
        </div>
      )}

      {/* Victory Modal */}
      {showVictory && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="flex scale-100 flex-col items-center rounded-2xl bg-white p-10 shadow-2xl animate-in zoom-in-95 duration-200 dark:bg-gray-800">
            <IconTrophy className="mb-6 h-24 w-24 text-yellow-400 drop-shadow-lg" />
            <h2 className="mb-2 text-4xl font-black text-gray-800 dark:text-white">闯关成功！</h2>
            <p className="mb-8 max-w-xs text-center text-gray-500 dark:text-gray-400">你已完成所有单词填空，太棒了！</p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  // Generate next one (maybe increase difficulty?)
                  generateLevel()
                }}
                className="rounded-full bg-indigo-600 px-8 py-3 text-lg font-bold text-white shadow-lg transition hover:scale-105 hover:bg-indigo-700 active:scale-95"
              >
                再玩一次
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CrosswordGame
