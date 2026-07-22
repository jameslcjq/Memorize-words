import type { Word } from '@/typings'
import { useState } from 'react'

type Props = {
  word: Word
  compact?: boolean
}

export default function WordInsights({ word, compact = false }: Props) {
  const [meaning, setMeaning] = useState('')
  const segments = [
    word.morph?.prefix && { ...word.morph.prefix, className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' },
    word.morph?.root && { ...word.morph.root, className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' },
    word.morph?.suffix && { ...word.morph.suffix, className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200' },
  ].filter(Boolean) as Array<{ text: string; meaning: string; className: string }>

  if (!segments.length && !word.phonics?.length && !word.wordFamily) return null

  return (
    <div className={`flex flex-col items-center gap-2 text-center ${compact ? 'mt-3 text-xs' : 'mt-4 text-sm'}`}>
      {segments.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1" aria-label="构词拆解">
          {segments.map((segment) => (
            <button
              key={`${segment.text}-${segment.meaning}`}
              type="button"
              title={segment.meaning}
              onClick={(event) => {
                event.stopPropagation()
                setMeaning(`${segment.text}：${segment.meaning}`)
              }}
              className={`rounded-md px-2 py-1 font-semibold ${segment.className}`}
            >
              {segment.text}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2 text-gray-500 dark:text-gray-400">
        {word.phonics?.length ? <span>拼读：{word.phonics.join(' · ')}</span> : null}
        {word.wordFamily ? <span>词族：{word.wordFamily}</span> : null}
      </div>
      {meaning && <span className="rounded bg-gray-100 px-2 py-1 text-gray-600 dark:bg-gray-700 dark:text-gray-200">{meaning}</span>}
    </div>
  )
}
