import Calendar from './Calendar'
import { db } from '@/utils/db'
import { ChapterRecord } from '@/utils/db/record'
import { useLiveQuery } from 'dexie-react-hooks'
import * as echarts from 'echarts'
import React, { useEffect, useRef, useState } from 'react'

// Helper to format duration
const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h > 0 ? h + '小时 ' : ''}${m}分 ${s}秒`
}

const MODE_NAMES: Record<string, string> = {
  typing: '背默单词',
  speller: '单词拼写',
  crossword: '填字游戏',
  selection: '词义选择',
  unknown: '未知模式',
}

const mapModeToGroup = (mode: string): string => {
  if (mode === 'word-to-trans' || mode === 'trans-to-word') return 'selection'
  if (MODE_NAMES[mode]) return mode
  return 'unknown'
}

const Statistics: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null)
  const [myChart, setMyChart] = useState<echarts.ECharts | null>(null)

  // Fetch chapter records
  const records = useLiveQuery(() => db.chapterRecords.toArray(), [])
  // Fetch top error words (top 20)
  const topErrors = useLiveQuery(() => db.wordRecords.orderBy('wrongCount').reverse().limit(20).toArray(), [])

  // Process data for charts
  // Process data for charts
  const { modeStats, checkedDates, hasData } = React.useMemo(() => {
    if (!records) return { modeStats: [], checkedDates: new Set<string>(), hasData: false }

    // Mode Stats
    const statsMap = new Map<string, { duration: number; count: number }>()
    // Initialize with 0 for main modes
    Object.keys(MODE_NAMES).forEach((k) => {
      if (k !== 'unknown') {
        statsMap.set(k, { duration: 0, count: 0 })
      }
    })

    const checkedDates = new Set<string>()

    records.forEach((r) => {
      const rawMode = r.mode || 'unknown'
      const mode = mapModeToGroup(rawMode)
      const duration = r.time || 0

      const current = statsMap.get(mode) || { duration: 0, count: 0 }
      statsMap.set(mode, {
        duration: current.duration + duration,
        count: current.count + 1,
      })

      const date = new Date(r.timeStamp).toISOString().split('T')[0]
      checkedDates.add(date)
    })

    const modeStats = Array.from(statsMap.entries())
      .filter(([name]) => name !== 'unknown')
      .map(([name, stats]) => ({
        name: MODE_NAMES[name] || name,
        value: stats.duration, // For Pie Chart
        count: stats.count,
        duration: stats.duration,
      }))

    return { modeStats, checkedDates, hasData: records.length > 0 }
  }, [records])

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
    myChart.setOption({
      title: {
        text: '各模式练习时长',
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
          data: modeStats,
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
      <h1 className="mb-8 text-3xl font-bold text-gray-800 dark:text-gray-100">数据统计</h1>

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

      {modeStats.length === 0 && !hasData ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="mb-4 text-xl text-gray-500 dark:text-gray-400">暂无练习数据</p>
          <p className="text-gray-400 dark:text-gray-500">快去练习一些单词吧！</p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Duration Chart */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
            </div>

            {/* Activity Calendar */}
            <div className="flex flex-col items-center justify-center">
              <Calendar checkedDates={checkedDates} />
            </div>
          </div>

          {/* Top Errors Table */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">高频错词（历史累计）</h2>
            {topErrors && topErrors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">单词</th>
                      <th className="px-6 py-3">错误次数</th>
                      <th className="px-6 py-3">正确次数</th>
                      <th className="px-6 py-3">最后练习模式</th>
                      <th className="px-6 py-3">所属词库</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topErrors.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-600"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{item.word}</td>
                        <td className="px-6 py-4 font-bold text-red-500">{item.wrongCount}</td>
                        <td className="px-6 py-4 text-green-500">{item.correctCount || 0}</td>
                        <td className="px-6 py-4">{MODE_NAMES[mapModeToGroup(item.mode || 'unknown')] || item.mode || '-'}</td>
                        <td className="px-6 py-4">{item.dict}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">暂无错题记录。</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Statistics
