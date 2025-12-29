import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { useEffect, useState } from 'react'
import IconBackspace from '~icons/tabler/backspace'

export const virtualKeyboardLayoutAtom = atomWithStorage<'qwerty' | 'alphabetical'>('virtualKeyboardLayout', 'qwerty')

export default function VirtualKeyboard() {
  const [layout, setLayout] = useAtom(virtualKeyboardLayoutAtom)
  const [isUppercase, setIsUppercase] = useState(false)
  const [pressedKey, setPressedKey] = useState<string | null>(null)

  const qwertyRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
    ["'", '-', '.', ' ', 'Backspace'],
  ]

  const alphaRows = [
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', '|', 'h', 'i', 'j', 'k', 'l', 'm', 'n'],
    ['o', 'p', 'q', 'r', 's', 't', '|', 'u', 'v', 'w', 'x', 'y', 'z'],
    ["'", '-', '.', ' ', 'Backspace'],
  ]

  const currentRows = layout === 'qwerty' ? qwertyRows : alphaRows

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setPressedKey(e.key.toLowerCase())
    }
    const handleKeyUp = () => {
      setPressedKey(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleKeyClick = (key: string) => {
    const downEvent = new KeyboardEvent('keydown', { key, bubbles: true })
    window.dispatchEvent(downEvent)
    setTimeout(() => {
      const upEvent = new KeyboardEvent('keyup', { key, bubbles: true })
      window.dispatchEvent(upEvent)
    }, 100)
  }

  const renderKey = (key: string, index: number) => {
    if (key === '__EMPTY__') {
      return <div key={`empty-${index}`} className="pointer-events-none h-10 w-10" />
    }
    const isPressed = pressedKey === key
    const displayKey = isUppercase ? key.toUpperCase() : key
    const isSpace = key === ' '
    const isBackspace = key === 'Backspace'

    return (
      <div
        key={key}
        onClick={() => handleKeyClick(key)}
        className={`flex h-10 ${
          isSpace ? 'w-20' : 'w-10'
        } cursor-pointer select-none items-center justify-center rounded-lg text-lg font-bold transition-all duration-100 ${
          isPressed
            ? 'scale-95 bg-indigo-500 text-white shadow-none'
            : 'bg-white text-gray-700 shadow-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        {isSpace ? '␣' : isBackspace ? <IconBackspace /> : displayKey}
      </div>
    )
  }

  return (
    <div className="flex select-none flex-col items-center justify-center gap-2 pt-4">
      <div className="mb-2 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="keyboardLayout"
              value="qwerty"
              checked={layout === 'qwerty'}
              onChange={() => setLayout('qwerty')}
              className="cursor-pointer"
            />
            标准键位 (QWERTY)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="keyboardLayout"
              value="alphabetical"
              checked={layout === 'alphabetical'}
              onChange={() => setLayout('alphabetical')}
              className="cursor-pointer"
            />
            顺序键位 (A-Z)
          </label>
        </div>

        <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-600"></div>

        <label className="flex cursor-pointer select-none items-center gap-2">
          <input
            type="checkbox"
            checked={isUppercase}
            onChange={(e) => setIsUppercase(e.target.checked)}
            className="cursor-pointer rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          显示大写 (Uppercase)
        </label>
      </div>

      <div className="flex min-w-fit flex-col items-center gap-2 rounded-xl bg-gray-100 p-4 shadow-inner dark:bg-gray-800">
        {currentRows.map((row, rowIndex) => {
          const splitIndex = row.indexOf('|')

          if (splitIndex !== -1 && layout === 'alphabetical') {
            const leftPart = row.slice(0, splitIndex)
            const rightPart = row.slice(splitIndex + 1)
            return (
              <div key={rowIndex} className="flex w-full justify-center gap-10">
                <div className="flex w-[328px] justify-center gap-2">{leftPart.map(renderKey)}</div>
                <div className="flex w-[328px] justify-center gap-2">{rightPart.map(renderKey)}</div>
              </div>
            )
          }
          return (
            <div key={rowIndex} className="mt-1 flex w-full justify-center gap-2">
              {row.map(renderKey)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
