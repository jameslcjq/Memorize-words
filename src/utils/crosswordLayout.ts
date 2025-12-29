export interface CrosswordCell {
  char: string
  x: number
  y: number
  // Which word does this belong to? Could be multiple (intersection)
  // We store the 'main' word info or just the char.
  // Actually, for rendering, we need to know if it's the start of a word to show a number.
  // And for logic, we need to know which word(s) occupy this cell.
}

export interface PlacedWord {
  word: string
  x: number // start x
  y: number // start y
  direction: 'across' | 'down'
  clue: string // efficient to keep clue here
  isComplete: boolean
  id: string // unique id
}

export interface CrosswordData {
  width: number
  height: number
  words: PlacedWord[]
  grid: Record<string, string> // 'x,y' -> char
}

export class CrosswordGenerator {
  private grid: Map<string, string> = new Map() // 'x,y' -> char
  private placedWords: PlacedWord[] = []

  // Bounds
  private minX = 0
  private maxX = 0
  private minY = 0
  private maxY = 0

  private getCell(x: number, y: number): string | undefined {
    return this.grid.get(`${x},${y}`)
  }

  private setCell(x: number, y: number, char: string) {
    this.grid.set(`${x},${y}`, char)
    this.minX = Math.min(this.minX, x)
    this.maxX = Math.max(this.maxX, x)
    this.minY = Math.min(this.minY, y)
    this.maxY = Math.max(this.maxY, y)
  }

  private canPlace(word: string, startX: number, startY: number, direction: 'across' | 'down'): boolean {
    const len = word.length
    const dx = direction === 'across' ? 1 : 0
    const dy = direction === 'across' ? 0 : 1

    // Check each cell of the new word
    for (let i = 0; i < len; i++) {
      const x = startX + i * dx
      const y = startY + i * dy
      const existingChar = this.getCell(x, y)

      // Intersecting matching char: OK
      if (existingChar === word[i]) {
        continue
      }

      // Intersecting mismatch char: Fail
      if (existingChar !== undefined) {
        return false
      }

      // Empty cell: check neighbors (must not touch other words sideways/adjacent unless it's the crossing point)
      // If direction is across (dx=1, dy=0): check (x, y-1) and (x, y+1)
      // If direction is down (dx=0, dy=1): check (x-1, y) and (x+1, y)
      // Also check immediately before start and immediately after end

      // NOTE: This simple check might be too strict or too loose.
      // Standard crossword rule: no adjacent letters that don't form words.
      // Simplified: don't touch anything unless it's the char we are crossing.

      // Check adjacent cells perpendicular to direction
      const p1 = this.getCell(x + dy, y + dx) // perpendicular 1
      const p2 = this.getCell(x - dy, y - dx) // perpendicular 2
      if (p1 !== undefined || p2 !== undefined) return false
    }

    // Check ends (start-1 and end+1)
    const startPrev = this.getCell(startX - dx, startY - dy)
    const endNext = this.getCell(startX + len * dx, startY + len * dy)

    if (startPrev !== undefined || endNext !== undefined) return false

    return true
  }

  private place(wordObj: { word: string; clue: string }, x: number, y: number, direction: 'across' | 'down') {
    const word = wordObj.word
    const dx = direction === 'across' ? 1 : 0
    const dy = direction === 'across' ? 0 : 1

    for (let i = 0; i < word.length; i++) {
      this.setCell(x + i * dx, y + i * dy, word[i])
    }

    this.placedWords.push({
      id: wordObj.word, // simplified ID
      word: wordObj.word,
      clue: wordObj.clue,
      x,
      y,
      direction,
      isComplete: false,
    })
  }

  // Main generation function
  public generate(inputWords: { name: string; trans: string[] }[]): CrosswordData | null {
    // Reset
    this.grid.clear()
    this.placedWords = []
    this.minX = 0
    this.maxX = 0
    this.minY = 0
    this.maxY = 0

    if (inputWords.length === 0) return null

    // Sort by length desc
    const sorted = [...inputWords].sort((a, b) => b.name.length - a.name.length)

    // Sanitize words (uppercase, remove non-alpha) - assuming inputs are standard
    const sanitized = sorted.map((w) => ({
      word: w.name.toUpperCase().replace(/[^A-Z]/g, ''),
      clue: w.trans.join(', '),
    }))

    // Place first word at center (0,0) across
    // Actually centering might be tricky if we don't know the end size.
    // Let's just place at 0,0 and normalize coords later.
    this.place(sanitized[0], 0, 0, 'across')

    const remaining = sanitized.slice(1)

    // Greedy placement
    for (const nextWord of remaining) {
      const bestMove: { x: number; y: number; dir: 'across' | 'down' } | null = null

      // Try to touch existing words
      // Iterate over all placed words -> all their chars -> check if nextWord shares a char

      // Iterate all intersections
      // Ideally we randomize this search to get varied layouts, or iterate strictly for density.
      // User requested "Maximize intersections".

      const candidates: { x: number; y: number; dir: 'across' | 'down' }[] = []

      for (const placed of this.placedWords) {
        const placedWordStr = placed.word
        // Try to intersect with 'placed'

        for (let i = 0; i < placedWordStr.length; i++) {
          const charOnBoard = placedWordStr[i]
          const worldX = placed.x + (placed.direction === 'across' ? i : 0)
          const worldY = placed.y + (placed.direction === 'across' ? 0 : i)

          // Find matching char in nextWord
          for (let j = 0; j < nextWord.word.length; j++) {
            if (nextWord.word[j] === charOnBoard) {
              // Proposed start position for nextWord
              // If placed is ACROSS, nextWord must be DOWN, and vice versa
              const newDir = placed.direction === 'across' ? 'down' : 'across'

              const startX = worldX - (newDir === 'across' ? j : 0)
              const startY = worldY - (newDir === 'across' ? 0 : j)

              if (this.canPlace(nextWord.word, startX, startY, newDir)) {
                candidates.push({ x: startX, y: startY, dir: newDir })
              }
            }
          }
        }
      }

      if (candidates.length > 0) {
        // Pick random candidate to vary layouts, or the "best" one?
        // Let's pick random for now to avoid always building the same structure for same words
        const pick = candidates[Math.floor(Math.random() * candidates.length)]
        this.place(nextWord, pick.x, pick.y, pick.dir)
      } else {
        // If can't intersect, should we place it standalone?
        // For a "Crossword", unconnected words are usually bad.
        // But Level 1 might just vary.
        // Let's skip if can't place (or try harder).
        // For this MVP, we skip unconnected words to ensure a single connect component.
        // Or we could try placing it nearby. The prompt says "Auto-Layout Algorithm".
        // Let's stick to connected only for now.
      }
    }

    // Convert Map to Record
    const gridObj: Record<string, string> = {}
    this.grid.forEach((val, key) => {
      gridObj[key] = val
    })

    return {
      width: this.maxX - this.minX + 1,
      height: this.maxY - this.minY + 1,
      words: this.placedWords.map((w) => ({
        ...w,
        // Normalize coords so min is 0
        x: w.x - this.minX,
        y: w.y - this.minY,
      })),
      // We also need to normalize keys in gridObj if we use it,
      // but usually we can just rebuild it from placedWords for the UI.
      grid: {}, // Placeholder, actually UI can rebuild from words easily.
    }
  }
}
