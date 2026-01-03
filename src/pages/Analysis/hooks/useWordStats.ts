import { db } from '@/utils/db'
import type { IWordRecord } from '@/utils/db/record'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

export interface IDailyDetail {
  date: string
  totalWordsCount: number
  practicedWords: string[]
  wrongWords: string[]
  duration: number
  moduleDurations: Record<string, number>
}

export interface IWordStats {
  isEmpty?: boolean
  stats: Record<string, IDailyDetail[]>
}

// 获取两个日期之间的所有日期，使用dayjs计算
function getDatesBetween(start: number, end: number) {
  const dates = []
  let curr = dayjs(start).startOf('day')
  const last = dayjs(end).endOf('day')

  while (curr.diff(last) < 0) {
    dates.push(curr.clone().format('YYYY-MM-DD'))
    curr = curr.add(1, 'day')
  }

  return dates
}

export function useWordStats(startTimeStamp: number, endTimeStamp: number) {
  const [wordStats, setWordStats] = useState<IWordStats>({
    stats: {
      all: [],
      typing: [],
      'word-to-trans': [],
      'trans-to-word': [],
    },
  })

  useEffect(() => {
    const fetchWordStats = async () => {
      const stats = await getChapterStats(startTimeStamp, endTimeStamp)
      setWordStats(stats)
    }

    fetchWordStats()
  }, [startTimeStamp, endTimeStamp])

  return wordStats
}

async function getChapterStats(startTimeStamp: number, endTimeStamp: number): Promise<IWordStats> {
  // indexedDB查找某个数字范围内的数据
  const records: IWordRecord[] = await db.wordRecords.where('timeStamp').between(startTimeStamp, endTimeStamp).toArray()

  if (records.length === 0) {
    return {
      isEmpty: true,
      stats: {
        all: [],
        typing: [],
        'word-to-trans': [],
        'trans-to-word': [],
      },
    }
  }

  // Helper to init data structure for all dates
  const initData = (dates: string[]) => {
    return dates
      .map((date) => ({
        [date]: {
          words: [],
          wrongWordsList: [],
          totalDuration: 0,
          moduleDurations: {},
        },
      }))
      .reduce(
        (acc, curr) => ({ ...acc, ...curr }),
        {} as Record<string, { words: string[]; wrongWordsList: string[]; totalDuration: number; moduleDurations: Record<string, number> }>,
      )
  }

  const dates = getDatesBetween(startTimeStamp * 1000, endTimeStamp * 1000)

  // Prepare data buckets for each mode + all
  const dataBuckets = {
    all: initData(dates),
    typing: initData(dates),
    'word-to-trans': initData(dates),
    'trans-to-word': initData(dates),
  } as Record<
    string,
    Record<string, { words: string[]; wrongWordsList: string[]; totalDuration: number; moduleDurations: Record<string, number> }>
  >

  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    const date = dayjs(r.timeStamp * 1000).format('YYYY-MM-DD')
    // Legacy records might lack mode, default to 'typing'
    const mode = r.mode || 'typing'

    // Calculate duration for this record (sum of timing array)
    // timing is array of milliseconds between keypresses
    const recordDuration = (r.timing || []).reduce((a, b) => a + b, 0)

    const processRecord = (bucket: any) => {
      if (bucket[date]) {
        bucket[date].words.push(r.word)
        if (r.wrongCount > 0) {
          bucket[date].wrongWordsList.push(r.word)
        }
        bucket[date].totalDuration += recordDuration

        // Track per-module duration
        processModuleDuration(bucket[date].moduleDurations, mode, recordDuration)
      }
    }

    const processModuleDuration = (moduleDurations: Record<string, number>, mode: string, duration: number) => {
      if (!moduleDurations[mode]) {
        moduleDurations[mode] = 0
      }
      moduleDurations[mode] += duration
    }

    // Add to 'all' bucket
    processRecord(dataBuckets.all)

    // Add to specific mode bucket
    if (dataBuckets[mode]) {
      processRecord(dataBuckets[mode])
    }
  }

  const processToDetails = (
    data: Record<string, { words: string[]; wrongWordsList: string[]; totalDuration: number; moduleDurations: Record<string, number> }>,
  ) => {
    return Object.entries(data)
      .map(([date, { words, wrongWordsList, totalDuration, moduleDurations }]) => ({
        date,
        totalWordsCount: words.length,
        practicedWords: words, // 这里如果不去重，则显示所有练习记录；如果去重则: Array.from(new Set(words))
        wrongWords: Array.from(new Set(wrongWordsList)), // 错词通常去重更有意义，或者也可以不去重
        duration: Math.round(totalDuration / 1000 / 60), // Convert ms to minutes
        moduleDurations: Object.fromEntries(Object.entries(moduleDurations).map(([k, v]) => [k, Math.round(v / 1000 / 60)])),
      }))
      .filter((detail) => detail.totalWordsCount > 0)
      .sort((a, b) => (dayjs(a.date).isBefore(dayjs(b.date)) ? 1 : -1)) // 按日期倒序
  }

  return {
    stats: {
      all: processToDetails(dataBuckets.all),
      typing: processToDetails(dataBuckets.typing),
      'word-to-trans': processToDetails(dataBuckets['word-to-trans']),
      'trans-to-word': processToDetails(dataBuckets['trans-to-word']),
    },
  }
}
