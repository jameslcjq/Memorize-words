import type { IChapterRecord } from '@/utils/db/record'
import React from 'react'

interface DetailedStatsProps {
  records: IChapterRecord[]
}

const MODE_NAMES: Record<string, string> = {
  speller: '单词填空',
  'word-to-trans': '英译中',
  'trans-to-word': '中译英',
  crossword: '填字游戏',
  typing: '背默单词',
  unknown: '未知模式',
}

const mapModeToGroup = (mode: string): string => {
  if (MODE_NAMES[mode]) return mode
  return 'unknown'
}

export const DetailedStats: React.FC<DetailedStatsProps> = ({ records }) => {
  if (!records || records.length === 0) return null

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
    if (!acc[dict][chapter][mode]) acc[dict][chapter][mode] = 0
    acc[dict][chapter][mode] += 1

    return acc
  }, {} as Record<string, Record<string, Record<string, number>>>)

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
                  <tr key={`${dict}-${chapter}`} className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700">
                    {/* Show dict name only on first row of this dict group if we wanted to span rows, 
                        but simpler to just repeat or empty if we don't implement rowSpan logic perfectly. 
                        Let's just show it. */}
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{index === 0 ? dict : ''}</td>
                    <td className="px-6 py-4">{chapter}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(modes).map(([mode, count]) => (
                          <span
                            key={mode}
                            className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-900/30 dark:text-indigo-400"
                          >
                            {MODE_NAMES[mode] || mode}: {count}
                          </span>
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
