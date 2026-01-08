import type { IChapterRecord, IWordRecord } from '@/utils/db/record'
import React from 'react'

interface DetailedStatsProps {
  records: IChapterRecord[]
  wordRecords: IWordRecord[]
}

const MODE_NAMES: Record<string, string> = {
  speller: '单词填空',
  'word-to-trans': '英译中',
  'trans-to-word': '中译英',
  crossword: '填字游戏',
  unknown: '未知模式',
}

const mapModeToGroup = (mode: string): string => {
  if (MODE_NAMES[mode]) return mode
  return 'unknown'
}

export const DetailedStats: React.FC<DetailedStatsProps> = ({ records, wordRecords }) => {
  if (!records || records.length === 0) return null

  // Ensure wordRecords is accessible by ID
  const wordMap = new Map<number, IWordRecord>()
  wordRecords.forEach((w) => {
    if (w.id) wordMap.set(w.id, w)
  })

  // Group by Dict -> Chapter -> Mode
  const grouped = records.reduce((acc, r) => {
    const dict = r.dict || '未知词库'
    // Chapter is number, convert to "Unit X"
    const chapter =
      r.chapter !== null && r.chapter !== undefined && r.chapter !== -1
        ? `第 ${r.chapter + 1} 单元`
        : r.chapter === -1
        ? '错题复习'
        : '未知章节'

    if (!acc[dict]) acc[dict] = {}
    if (!acc[dict][chapter]) acc[dict][chapter] = {}

    const mode = mapModeToGroup(r.mode || 'unknown')
    if (!acc[dict][chapter][mode]) {
      acc[dict][chapter][mode] = { count: 0, wrongWords: new Set<string>() }
    }

    acc[dict][chapter][mode].count += 1

    // Collect wrong words for this session
    if (r.wordRecordIds) {
      r.wordRecordIds.forEach((id) => {
        const w = wordMap.get(id)
        if (w && w.wrongCount > 0) {
          acc[dict][chapter][mode].wrongWords.add(w.word)
        }
      })
    }

    return acc
  }, {} as Record<string, Record<string, Record<string, { count: number; wrongWords: Set<string> }>>>)

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">详细练习记录</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3">词库</th>
              <th className="px-6 py-3">章节</th>
              <th className="px-6 py-3">练习详情</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {Object.entries(grouped).map(([dict, chapters]) => (
              <React.Fragment key={dict}>
                {Object.entries(chapters).map(([chapter, modes], index) => (
                  <tr key={`${dict}-${chapter}`} className="bg-white text-base hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 align-top font-medium text-gray-900 dark:text-white">{index === 0 ? dict : ''}</td>
                    <td className="px-6 py-4 align-top">{chapter}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-3">
                        {Object.entries(modes).map(([mode, { count, wrongWords }]) => (
                          <div key={mode} className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-400">
                              {MODE_NAMES[mode] || mode}: {count} 次
                            </span>
                            {wrongWords.size > 0 && (
                              <div className="ml-1 text-xs text-red-500">
                                <span className="font-semibold">错词: </span>
                                {Array.from(wrongWords).join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
