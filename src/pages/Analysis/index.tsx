import CalendarCard from './components/CalendarCard'
import { useWordStats } from './hooks/useWordStats'
import Layout from '@/components/Layout'
import LoginModal from '@/components/LoginModal'
import { useCloudSync } from '@/hooks/useCloudSync'
import { isOpenDarkModeAtom } from '@/store'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import dayjs from 'dayjs'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useNavigate } from 'react-router-dom'
import IconX from '~icons/tabler/x'

const Analysis = () => {
  const navigate = useNavigate()
  const [, setIsOpenDarkMode] = useAtom(isOpenDarkModeAtom)
  const [selectedDate, setSelectedDate] = useState<string | null>(dayjs().format('YYYY-MM-DD'))

  // Cloud Sync
  const { syncData, isSyncing, cloudStats, localStats } = useCloudSync()
  useEffect(() => {
    syncData()
  }, [syncData])

  const onBack = useCallback(() => {
    navigate('/')
  }, [navigate])

  const changeDarkModeState = () => {
    setIsOpenDarkMode((old) => !old)
  }

  useHotkeys(
    'ctrl+d',
    () => {
      changeDarkModeState()
    },
    { enableOnFormTags: true, preventDefault: true },
    [],
  )

  useHotkeys('enter,esc', onBack, { preventDefault: true })

  const { isEmpty } = useWordStats(dayjs().subtract(1, 'year').unix(), dayjs().unix())

  // Merge Data Logic
  const allStats = useMemo(() => {
    const map = new Map<string, any>()

    // 1. Add Local Data
    localStats.forEach((s: any) => map.set(s.date, { ...s }))

    // 2. Merge Cloud Data
    cloudStats.forEach((c: any) => {
      const existing = map.get(c.date)
      if (!existing) {
        // Cloud only data
        map.set(c.date, {
          date: c.date,
          totalWordsCount: c.wordCount,
          duration: c.duration,
          practicedWords: [], // Detail missing in partial sync
          wrongWords: [],
          moduleDurations: {},
        })
      } else {
        // Merge strategy: Max Wins for counters
        existing.totalWordsCount = Math.max(existing.totalWordsCount, c.wordCount)
        existing.duration = Math.max(existing.duration, c.duration)
      }
    })

    return Array.from(map.values())
  }, [localStats, cloudStats])

  // Find stats for selected date
  const selectedDetail = allStats.find((d) => d.date === selectedDate)

  // List of all dates with practice data
  const practicedDates = allStats.map((item) => item.date)

  const moduleNames: Record<string, string> = {
    typing: '背默单词',
    'word-to-trans': '英译中',
    'trans-to-word': '中译英',
  }

  return (
    <Layout>
      <div className="flex w-full flex-1 flex-col overflow-y-auto pl-20 pr-20 pt-20">
        <IconX className="absolute right-20 top-10 mr-2 h-7 w-7 cursor-pointer text-gray-400" onClick={onBack} />
        <ScrollArea.Root className="flex-1 overflow-y-auto">
          <ScrollArea.Viewport className="h-full w-auto pb-[20rem] [&>div]:!block">
            {isEmpty ? (
              <div className="align-items-center m-4 grid h-80 w-auto place-content-center overflow-hidden rounded-lg shadow-lg dark:bg-gray-600">
                <div className="text-2xl text-gray-400">暂无练习数据</div>
              </div>
            ) : (
              <>
                <div className="mx-4 my-8 h-auto w-auto overflow-hidden rounded-lg p-8 shadow-lg dark:bg-gray-700 dark:bg-opacity-50">
                  <div className="mb-4 flex justify-end">
                    <LoginModal />
                  </div>
                  <div className="flex justify-center">
                    <CalendarCard practicedDates={practicedDates} selectedDate={selectedDate} onDateSelect={setSelectedDate} />
                  </div>

                  <div className="mt-8 border-t border-gray-200 pt-8 dark:border-gray-600">
                    <h2 className="mb-6 text-xl font-bold text-gray-700 dark:text-gray-200">{selectedDate} 练习详情</h2>

                    {selectedDetail ? (
                      <div className="flex flex-col gap-6">
                        <div
                          key={selectedDetail.date}
                          className="rounded-xl border border-gray-200 bg-white/50 p-6 dark:border-gray-600 dark:bg-gray-800/50"
                        >
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-700">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-indigo-500">{selectedDetail.date}</span>
                              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
                                {dayjs(selectedDetail.date).format('dddd')}
                              </span>
                            </div>
                            <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                              <span>
                                总时长:{' '}
                                <span className="font-semibold text-gray-900 dark:text-gray-200">{selectedDetail.duration} 分钟</span>
                              </span>
                              <span>
                                总词数:{' '}
                                <span className="font-semibold text-gray-900 dark:text-gray-200">{selectedDetail.totalWordsCount}</span>
                              </span>
                              <span>
                                错词数: <span className="font-semibold text-red-500">{selectedDetail.wrongWords.length}</span>
                              </span>
                            </div>
                          </div>

                          {/* Module Durations */}
                          {selectedDetail.moduleDurations && Object.keys(selectedDetail.moduleDurations).length > 0 && (
                            <div className="mb-4">
                              <span className="mb-2 block text-sm font-semibold text-gray-600 dark:text-gray-300">模块时长</span>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(selectedDetail.moduleDurations).map(
                                  ([mode, min]) =>
                                    min > 0 && (
                                      <span
                                        key={`duration-${mode}`}
                                        className="rounded-md bg-blue-50 px-2 py-1 text-sm text-blue-600 ring-1 ring-inset ring-blue-500/10 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-500/20"
                                      >
                                        {moduleNames[mode] || mode}: {min} 分钟
                                      </span>
                                    ),
                                )}
                              </div>
                            </div>
                          )}

                          {/* Wrong Words */}
                          {selectedDetail.wrongWords.length > 0 && (
                            <div className="mb-4">
                              <span className="mb-2 block text-sm font-semibold text-red-500">错词列表</span>
                              <div className="flex flex-wrap gap-2">
                                {selectedDetail.wrongWords.map((w, idx) => (
                                  <span
                                    key={`${selectedDetail.date}-wrong-${idx}`}
                                    className="rounded-md bg-red-50 px-2 py-1 text-sm text-red-600 ring-1 ring-inset ring-red-500/10 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-500/20"
                                  >
                                    {w}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Practiced Words */}
                          <div>
                            <details className="group">
                              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-gray-600 transition-colors hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400">
                                <span className="transition-transform duration-200 group-open:rotate-90">▶</span>
                                练习单词列表 ({selectedDetail.practicedWords.length})
                              </summary>
                              <div className="mt-3 flex flex-wrap gap-2 pl-4">
                                {selectedDetail.practicedWords.map((w, i) => (
                                  <span
                                    key={`${selectedDetail.date}-word-${i}`}
                                    className="rounded-md bg-gray-100 px-2 py-1 text-sm text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                  >
                                    {w}
                                  </span>
                                ))}
                              </div>
                            </details>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-center text-gray-500 dark:text-gray-400">该日期无练习记录</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent " orientation="vertical"></ScrollArea.Scrollbar>
        </ScrollArea.Root>
        <div className="overflow-y-auto"></div>
      </div>
    </Layout>
  )
}

export default Analysis
