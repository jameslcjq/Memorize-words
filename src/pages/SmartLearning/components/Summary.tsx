import type { SmartLearningRecord } from '@/utils/db/smart-learning-record'

interface SummaryProps {
  record: SmartLearningRecord
  onContinue?: () => void
  onExit: () => void
  hasMoreGroups: boolean
}

export default function Summary({ record, onContinue, onExit, hasMoreGroups }: SummaryProps) {
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const avgTimePerWord = Math.floor(record.totalTime / record.wordsCount)

  const avgStageTimes = {
    englishToChinese: 0,
    chineseToEnglish: 0,
    speller: 0,
    typing: 0,
  }

  record.wordDetails.forEach((detail) => {
    avgStageTimes.englishToChinese += detail.stageTimes.englishToChinese
    avgStageTimes.chineseToEnglish += detail.stageTimes.chineseToEnglish
    avgStageTimes.speller += detail.stageTimes.speller
    avgStageTimes.typing += detail.stageTimes.typing
  })

  Object.keys(avgStageTimes).forEach((key) => {
    avgStageTimes[key as keyof typeof avgStageTimes] = Math.floor(avgStageTimes[key as keyof typeof avgStageTimes] / record.wordsCount)
  })

  const totalDowngrades = record.wordDetails.reduce((sum, detail) => sum + detail.downgrades, 0)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
        {/* 标题 */}
        <div className="mb-8 text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">恭喜！第{record.groupNumber + 1}组单词学习完成</h1>
        </div>

        {/* 统计卡片 */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-indigo-50 p-4 text-center dark:bg-indigo-950">
            <div className="mb-1 text-sm text-gray-600 dark:text-gray-400">总耗时</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatTime(record.totalTime)}</div>
          </div>
          <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-950">
            <div className="mb-1 text-sm text-gray-600 dark:text-gray-400">完成单词</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{record.wordsCount}/10</div>
          </div>
          <div className="rounded-lg bg-yellow-50 p-4 text-center dark:bg-yellow-950">
            <div className="mb-1 text-sm text-gray-600 dark:text-gray-400">平均每词</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{formatTime(avgTimePerWord)}</div>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 text-center dark:bg-purple-950">
            <div className="mb-1 text-sm text-gray-600 dark:text-gray-400">降级次数</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalDowngrades}</div>
          </div>
        </div>

        {/* 阶段平均耗时 */}
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white">阶段平均耗时</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <span className="text-gray-700 dark:text-gray-300">认知阶段（英译中+中译英）</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatTime(avgStageTimes.englishToChinese + avgStageTimes.chineseToEnglish)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <span className="text-gray-700 dark:text-gray-300">拼写阶段（单词填空）</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatTime(avgStageTimes.speller)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
              <span className="text-gray-700 dark:text-gray-300">听写阶段（听写单词）</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatTime(avgStageTimes.typing)}</span>
            </div>
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-4">
          {hasMoreGroups && onContinue && (
            <button
              onClick={onContinue}
              className="flex-1 rounded-lg bg-indigo-500 py-3 font-semibold text-white transition-colors hover:bg-indigo-600"
            >
              继续下一组
            </button>
          )}
          <button
            onClick={onExit}
            className="flex-1 rounded-lg border-2 border-gray-300 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
          >
            返回主页
          </button>
        </div>
      </div>
    </div>
  )
}
