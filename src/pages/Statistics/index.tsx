import Calendar from './Calendar'
import { DetailedStats } from './DetailedStats'
import { learningPlanAtom } from '@/store'
import { db } from '@/utils/db'
import { ChapterRecord } from '@/utils/db/record'
import { useLiveQuery } from 'dexie-react-hooks'
import * as echarts from 'echarts'
import { useAtomValue } from 'jotai'
import { ArrowLeft, Flame, Target } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Helper to format duration
const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h > 0 ? h + '小时 ' : ''}${m}分 ${s}秒`
}

const getLocalDateString = (dateInput: number | Date) => {
  const date = typeof dateInput === 'number' ? new Date(dateInput * 1000) : dateInput
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Calculate consecutive streak from a set of date strings
const calculateStreak = (checkedDates: Set<string>): number => {
  if (checkedDates.size === 0) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  const currentDate = new Date(today)

  // Check if today is checked, if not start from yesterday
  const todayStr = getLocalDateString(today)
  if (!checkedDates.has(todayStr)) {
    currentDate.setDate(currentDate.getDate() - 1)
  }

  // Count consecutive days backwards
  while (checkedDates.has(getLocalDateString(currentDate))) {
    streak++
    currentDate.setDate(currentDate.getDate() - 1)
  }

  return streak
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

const Statistics: React.FC = () => {
  const navigate = useNavigate()
  const chartRef = useRef<HTMLDivElement>(null)
  const [myChart, setMyChart] = useState<echarts.ECharts | null>(null)
  const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()))
  const learningPlan = useAtomValue(learningPlanAtom)

  // Fetch chapter records
  const records = useLiveQuery(() => db.chapterRecords.toArray(), [])

  // Process data for charts
  const { modeStats, checkedDates, hasData, dailyDuration, dailyCount, dailyRecords, streak, todayWordCount } = React.useMemo(() => {
    if (!records)
      return {
        modeStats: [],
        checkedDates: new Set<string>(),
        hasData: false,
        dailyDuration: 0,
        dailyCount: 0,
        dailyRecords: [],
        streak: 0,
        todayWordCount: 0,
      }

    const checkedDates = new Set<string>()
    records.forEach((r) => {
      const date = getLocalDateString(r.timeStamp)
      checkedDates.add(date)
    })

    // Calculate streak
    const streak = calculateStreak(checkedDates)

    // Calculate today's word count
    const todayStr = getLocalDateString(new Date())
    const todayRecords = records.filter((r) => getLocalDateString(r.timeStamp) === todayStr)
    const todayWordCount = todayRecords.reduce((acc, r) => acc + (r.wordCount || 0), 0)

    // Filter by selected Date
    const dailyRecords = records.filter((r) => getLocalDateString(r.timeStamp) === selectedDate)

    // Mode Stats based on DAILY records
    const statsMap = new Map<string, { duration: number; count: number }>()
    Object.keys(MODE_NAMES).forEach((k) => {
      if (k !== 'unknown') {
        statsMap.set(k, { duration: 0, count: 0 })
      }
    })

    dailyRecords.forEach((r) => {
      const rawMode = r.mode || 'unknown'
      const mode = mapModeToGroup(rawMode)
      const duration = r.time || 0

      const current = statsMap.get(mode) || { duration: 0, count: 0 }
      statsMap.set(mode, {
        duration: current.duration + duration,
        count: current.count + 1,
      })
    })

    const modeStats = Array.from(statsMap.entries())
      .filter(([name]) => name !== 'unknown')
      .map(([name, stats]) => ({
        name: MODE_NAMES[name] || name,
        value: stats.duration, // For Pie Chart
        count: stats.count,
        duration: stats.duration,
      }))

    const dailyDuration = dailyRecords.reduce((acc, r) => acc + (r.time || 0), 0)
    const dailyCount = dailyRecords.length

    return { modeStats, checkedDates, hasData: records.length > 0, dailyDuration, dailyCount, dailyRecords, streak, todayWordCount }
  }, [records, selectedDate])

  const dailyWordIds = React.useMemo(() => dailyRecords.flatMap((r) => r.wordRecordIds || []), [dailyRecords])
  const dailyWordRecords = useLiveQuery(() => db.wordRecords.where('id').anyOf(dailyWordIds).toArray(), [dailyWordIds])

  useEffect(() => {
    if (!chartRef.current) return
    const chart = echarts.init(chartRef.current)
    setMyChart(chart)

    const handleResize = () => chart.resize()
    window.addEventListener('resize', handleResize)

    return () => {
      chart.dispose()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!myChart) return
    // Only update chart if we have some duration data, otherwise it looks empty/weird
    // Or we keep it 0.

    myChart.setOption({
      title: {
        text: '各模式练习时长 (当日)',
        left: 'center',
        textStyle: {
          color: document.documentElement.classList.contains('dark') ? '#ccc' : '#333',
        },
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `${params.name}: ${formatDuration(params.value)} (${params.percent}%)`
        },
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        textStyle: {
          color: document.documentElement.classList.contains('dark') ? '#ccc' : '#333',
        },
      },
      series: [
        {
          name: '时长',
          type: 'pie',
          radius: '50%',
          data: modeStats.filter((s) => s.value > 0).length > 0 ? modeStats : [{ name: '无数据', value: 0 }], // Handle empty case gracefully?
          // Actually echarts handles empty data usually fine, or we can just pass modeStats.
          // If all 0, pie might disappear.
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          label: {
            color: document.documentElement.classList.contains('dark') ? '#ccc' : '#333',
          },
        },
      ],
    })
  }, [myChart, modeStats])

  if (!records) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center p-8">
        <div className="text-xl text-gray-500 dark:text-gray-400">正在加载统计数据...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto min-h-screen p-8">
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          title="返回首页"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">数据统计</h1>
      </div>

      {/* Streak & Daily Progress Card */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Streak Card */}
        <div className="flex items-center gap-4 rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm dark:border-orange-900/30 dark:from-orange-900/20 dark:to-amber-900/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
            <Flame className="h-8 w-8 text-orange-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">连续打卡</div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-orange-600 dark:text-orange-400">{streak}</span>
              <span className="text-lg text-orange-500">天</span>
            </div>
          </div>
        </div>

        {/* Daily Progress Card */}
        <div className="flex flex-col gap-2 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm dark:border-indigo-900/30 dark:from-indigo-900/20 dark:to-purple-900/20">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">今日目标</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{todayWordCount}</span>
            <span className="text-gray-400">/</span>
            <span className="text-lg text-gray-500 dark:text-gray-400">{learningPlan.dailyGoal} 词</span>
          </div>
          {/* Progress Bar */}
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (todayWordCount / learningPlan.dailyGoal) * 100)}%` }}
            />
          </div>
          {todayWordCount >= learningPlan.dailyGoal && (
            <div className="text-center text-sm font-medium text-green-600 dark:text-green-400">🎉 今日目标已完成！</div>
          )}
        </div>
      </div>

      {modeStats.length === 0 && !hasData ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="mb-4 text-xl text-gray-500 dark:text-gray-400">暂无练习数据</p>
          <p className="text-gray-400 dark:text-gray-500">快去练习一些单词吧！</p>
        </div>
      ) : (
        <>
          {/* Activity Calendar & Summary (Moved to Top) */}
          <div className="mb-8 flex flex-col items-start gap-8 md:flex-row md:items-start md:justify-center">
            <Calendar checkedDates={checkedDates} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

            {/* Daily Summary */}
            <div className="mt-0 w-full max-w-[360px] rounded-xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-lg font-medium text-gray-700 dark:text-gray-200">{selectedDate}</span>
                <span
                  className={`rounded-full px-3 py-1 text-sm ${
                    modeStats && dailyCount > 0
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {modeStats && dailyCount > 0 ? '已完成' : '未打卡'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">当日时长</span>
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatDuration(dailyDuration || 0)}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">当日练习</span>
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{dailyCount || 0} 次</span>
                </div>
              </div>
            </div>
          </div>

          {/* Mode Stats Cards */}
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modeStats.map((stat) => (
              <div
                key={stat.name}
                className="flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
              >
                <h3 className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-200">{stat.name}</h3>
                <div className="mt-auto">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">练习时长</span>
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{formatDuration(stat.duration)}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">练习次数</span>
                    <span className="text-lg font-medium text-gray-800 dark:text-gray-100">{stat.count} 次</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Duration Chart (Full Width) */}
          <div className="mb-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
          </div>

          <div className="mb-12">
            <DetailedStats records={dailyRecords} wordRecords={dailyWordRecords || []} />
          </div>
        </>
      )}
    </div>
  )
}

export default Statistics
