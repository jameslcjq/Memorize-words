import { db } from '@/utils/db'
import { ChapterRecord } from '@/utils/db/record'
import { useLiveQuery } from 'dexie-react-hooks'
import * as echarts from 'echarts'
import React, { useEffect, useRef, useState } from 'react'
import ActivityCalendar from 'react-activity-calendar'

// Helper to format duration
const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`
}

const Statistics: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null)
  const [myChart, setMyChart] = useState<echarts.ECharts | null>(null)

  // Fetch chapter records
  const records = useLiveQuery(() => db.chapterRecords.toArray(), [])
  // Fetch top error words (top 20)
  const topErrors = useLiveQuery(() => db.wordRecords.orderBy('wrongCount').reverse().limit(20).toArray(), [])

  // Process data for charts
  const { modeStats, activityData } = React.useMemo(() => {
    if (!records) return { modeStats: [], activityData: [] }

    // Mode Stats
    const statsMap = new Map<string, number>()
    // Activity Calendar
    const dateMap = new Map<string, number>()

    records.forEach((r) => {
      const mode = r.mode || 'unknown'
      const duration = r.time || 0
      statsMap.set(mode, (statsMap.get(mode) || 0) + duration)

      // Activity
      const date = new Date(r.timeStamp).toISOString().split('T')[0]
      const currentCount = dateMap.get(date) || 0
      dateMap.set(date, currentCount + 1)
    })

    const modeStats = Array.from(statsMap.entries()).map(([name, value]) => ({ name, value }))

    // Activity Data
    const activityData = Array.from(dateMap.entries())
      .map(([date, count]) => ({
        date,
        count,
        // Level logic: 0=0, 1=1-2, 2=3-5, 3=6-9, 4=10+
        level: count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 9 ? 3 : 4,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)) as any[]

    return { modeStats, activityData }
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
        text: 'Practice Duration by Mode',
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
          name: 'Duration',
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
        <div className="text-xl text-gray-500 dark:text-gray-400">Loading statistics...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto min-h-screen p-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-800 dark:text-gray-100">Statistics</h1>

      {modeStats.length === 0 && activityData.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <p className="mb-4 text-xl text-gray-500 dark:text-gray-400">No practice data found yet.</p>
          <p className="text-gray-400 dark:text-gray-500">Go practice some words and come back!</p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* Duration Chart */}
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div ref={chartRef} style={{ width: '100%', height: '400px' }} />
            </div>

            {/* Activity Calendar */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-6 self-start text-xl font-semibold text-gray-700 dark:text-gray-200">Activity Calendar</h2>
              <ActivityCalendar
                data={activityData}
                labels={{
                  totalCount: '{{count}} sessions in last year',
                }}
                theme={{
                  light: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
                  dark: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
                }}
              />
            </div>
          </div>

          {/* Top Errors Table */}
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">Top Error Words (All Time)</h2>
            {topErrors && topErrors.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-700 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">Word</th>
                      <th className="px-6 py-3">Wrong Count</th>
                      <th className="px-6 py-3">Correct Count</th>
                      <th className="px-6 py-3">Last Mode</th>
                      <th className="px-6 py-3">Dictionary</th>
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
                        <td className="px-6 py-4">{item.mode || '-'}</td>
                        <td className="px-6 py-4">{item.dict}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No error records found.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Statistics
