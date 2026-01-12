import { LearningStage } from '@/utils/db/smart-learning-record'

interface StageIndicatorProps {
  currentStage: LearningStage
  stagesCompleted: {
    englishToChinese: boolean
    chineseToEnglish: boolean
    speller: boolean
    typing: boolean
  }
}

const stageInfo = {
  [LearningStage.ENGLISH_TO_CHINESE]: { name: '英译中', color: 'bg-blue-500', order: 1 },
  [LearningStage.CHINESE_TO_ENGLISH]: { name: '中译英', color: 'bg-blue-500', order: 1 },
  [LearningStage.SPELLER]: { name: '单词填空', color: 'bg-yellow-500', order: 2 },
  [LearningStage.TYPING]: { name: '听写单词', color: 'bg-orange-500', order: 3 },
  [LearningStage.COMPLETED]: { name: '已完成', color: 'bg-green-500', order: 4 },
}

export default function StageIndicator({ currentStage, stagesCompleted }: StageIndicatorProps) {
  const getStageProgress = () => {
    let completed = 0
    const total = 4

    // 阶段1：认知阶段
    if (stagesCompleted.englishToChinese && stagesCompleted.chineseToEnglish) {
      completed++
    }
    // 阶段2：单词填空
    if (stagesCompleted.speller) {
      completed++
    }
    // 阶段3：听写单词
    if (stagesCompleted.typing) {
      completed++
    }
    // 阶段4：完成
    if (currentStage === LearningStage.COMPLETED) {
      completed++
    }

    return { completed, total, percentage: (completed / total) * 100 }
  }

  const progress = getStageProgress()
  const info = stageInfo[currentStage]

  return (
    <div className="flex flex-col items-center gap-3">
      {/* 进度条 */}
      <div className="w-full">
        <div className="mb-2 flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{info.name}</span>
          <span>
            {progress.completed}/{progress.total} 阶段
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div className={`h-full ${info.color} transition-all duration-500`} style={{ width: `${progress.percentage}%` }} />
        </div>
      </div>

      {/* 阶段图标 */}
      <div className="flex items-center gap-2">
        {/* 阶段1：认知 */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${
            stagesCompleted.englishToChinese && stagesCompleted.chineseToEnglish
              ? 'bg-green-500'
              : currentStage === LearningStage.ENGLISH_TO_CHINESE || currentStage === LearningStage.CHINESE_TO_ENGLISH
              ? 'bg-blue-500'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          1
        </div>
        <div className="h-1 w-8 bg-gray-300 dark:bg-gray-600" />

        {/* 阶段2：填空 */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${
            stagesCompleted.speller
              ? 'bg-green-500'
              : currentStage === LearningStage.SPELLER
              ? 'bg-yellow-500'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          2
        </div>
        <div className="h-1 w-8 bg-gray-300 dark:bg-gray-600" />

        {/* 阶段3：听写 */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${
            stagesCompleted.typing
              ? 'bg-green-500'
              : currentStage === LearningStage.TYPING
              ? 'bg-orange-500'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          3
        </div>
        <div className="h-1 w-8 bg-gray-300 dark:bg-gray-600" />

        {/* 阶段4：完成 */}
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ${
            currentStage === LearningStage.COMPLETED ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          ✓
        </div>
      </div>
    </div>
  )
}
