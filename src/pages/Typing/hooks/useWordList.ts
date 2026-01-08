import { CHAPTER_LENGTH } from '@/constants'
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition'
import {
  currentDictInfoAtom,
  exerciseModeAtom,
  loopWordConfigAtom,
  quizConfigAtom,
  reviewModeInfoAtom,
  selectedChaptersAtom,
} from '@/store'
import type { Word, WordWithIndex } from '@/typings/index'
import { db } from '@/utils/db'
import shuffle from '@/utils/shuffle'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'

export type UseWordListResult = {
  words: WordWithIndex[]
  isLoading: boolean
  error: any
}

/**
 * Use word lists from the current selected dictionary.
 */
export function useWordList(): UseWordListResult {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const [selectedChapters, setSelectedChapters] = useAtom(selectedChaptersAtom)
  const { isReviewMode, reviewRecord } = useAtomValue(reviewModeInfoAtom)
  const quizConfig = useAtomValue(quizConfigAtom)
  const exerciseMode = useAtomValue(exerciseModeAtom)
  const loopWordConfig = useAtomValue(loopWordConfigAtom)

  // Ensure selectedChapters are valid
  // If max is out of bounds, reset to [0]
  useEffect(() => {
    if (selectedChapters.some((c) => c >= currentDictInfo.chapterCount)) {
      setSelectedChapters([0])
    }
  }, [currentDictInfo.chapterCount, selectedChapters, setSelectedChapters])

  // Is first chapter check: only true if strictly [0] selected?
  // Let's keep it simple: if selectedChapters includes 0 and length is 1.
  const isFirstChapter = !isReviewMode && currentDictInfo.id === 'cet4' && selectedChapters.length === 1 && selectedChapters[0] === 0
  const { data: wordList, error: swrError, isLoading: isSwrLoading } = useSWR(currentDictInfo.url, wordListFetcher)

  const [errorWords, setErrorWords] = useState<Word[]>([])
  const [isDatabaseLoading, setIsDatabaseLoading] = useState(false)

  useEffect(() => {
    if (selectedChapters.includes(-2)) {
      setIsDatabaseLoading(true)
      db.wordRecords
        .where('dict')
        .equals(currentDictInfo.id)
        .and((r) => r.wrongCount > 0)
        .toArray()
        .then((records) => {
          // 对单词进行去重，因为同一个单词可能有多个错误记录
          const uniqueWordsMap = new Map<string, Word>()
          records.forEach((r) => {
            if (!uniqueWordsMap.has(r.word)) {
              uniqueWordsMap.set(r.word, { name: r.word, trans: [], usphone: '', ukphone: '' })
            }
          })

          // 尝试从 wordList 中补充完整信息
          if (wordList) {
            uniqueWordsMap.forEach((val, key) => {
              const fullWord = wordList.find((w) => w.name === key)
              if (fullWord) {
                uniqueWordsMap.set(key, fullWord)
              }
            })
          }

          setErrorWords(shuffle(Array.from(uniqueWordsMap.values())).slice(0, CHAPTER_LENGTH))
        })
        .finally(() => {
          setIsDatabaseLoading(false)
        })
    }
  }, [selectedChapters, currentDictInfo.id, wordList])

  const [smartReviewWords, setSmartReviewWords] = useState<Word[]>([])
  const { getTodayReviewWords } = useSpacedRepetition()

  useEffect(() => {
    if (selectedChapters.includes(-3)) {
      setIsDatabaseLoading(true)
      getTodayReviewWords(currentDictInfo.id)
        .then((records) => {
          const uniqueWordsMap = new Map<string, Word>()
          // Initialize with basic info from record
          records.forEach((r) => {
            if (!uniqueWordsMap.has(r.word)) {
              uniqueWordsMap.set(r.word, { name: r.word, trans: [], usphone: '', ukphone: '' })
            }
          })

          // Hydrate with full details from wordList
          if (wordList) {
            uniqueWordsMap.forEach((val, key) => {
              const fullWord = wordList.find((w) => w.name === key)
              if (fullWord) {
                uniqueWordsMap.set(key, fullWord)
              }
            })
          }

          setSmartReviewWords(shuffle(Array.from(uniqueWordsMap.values())).slice(0, CHAPTER_LENGTH))
        })
        .finally(() => {
          setIsDatabaseLoading(false)
        })
    }
  }, [selectedChapters, currentDictInfo.id, wordList, getTodayReviewWords])

  const words: WordWithIndex[] = useMemo(() => {
    let newWords: Word[]
    if (isFirstChapter) {
      newWords = firstChapter
    } else if (isReviewMode) {
      newWords = reviewRecord?.words ?? []
    } else if (wordList) {
      if (selectedChapters.includes(-1)) {
        // 全词库随机模式：从完整的 wordList 中随机选取 CHAPTER_LENGTH 个
        newWords = shuffle(wordList).slice(0, CHAPTER_LENGTH)
      } else if (selectedChapters.includes(-2)) {
        newWords = errorWords
      } else if (selectedChapters.includes(-3)) {
        newWords = smartReviewWords
      } else {
        // Multi-chapter selection logic
        const selectedWords: Word[] = []

        selectedChapters.forEach((chapterIndex) => {
          if (chapterIndex < 0) return

          let start = 0
          let end = 0
          if (currentDictInfo.chapterLengths) {
            start = currentDictInfo.chapterLengths.slice(0, chapterIndex).reduce((a, b) => a + b, 0)
            end = start + currentDictInfo.chapterLengths[chapterIndex]
          } else {
            start = chapterIndex * CHAPTER_LENGTH
            end = (chapterIndex + 1) * CHAPTER_LENGTH
          }
          const chapterWords = wordList.slice(start, end)
          selectedWords.push(...chapterWords)
        })

        // Loop Logic: Duplicate words based on loop times, then shuffle all together
        // loopWordConfig.times is 1, 2, 3, 4, 5
        const loopTimes = loopWordConfig.times || 1

        if (loopTimes > 1) {
          const loopedWords: Word[] = []
          for (let i = 0; i < loopTimes; i++) {
            loopedWords.push(...selectedWords)
          }

          // Apply shuffle first
          const shuffled = shuffle(loopedWords)

          // Heuristic to reduce consecutive duplicates
          // Iterate through the array, if current == previous, swap current with a random candidate ahead
          for (let i = 1; i < shuffled.length; i++) {
            if (shuffled[i].name === shuffled[i - 1].name) {
              // Collision found. Look for a swap candidate ahead.
              // We want an index j > i such that shuffled[j] != shuffled[i] (which is also != shuffled[i-1])
              // Ideally shuffled[j] should also not match shuffled[i-1] (obvious) and usually we should check if putting shuffled[i] at j causes conflict there,
              // but simple forward swap is usually sufficient for low density collisions.
              let swapped = false
              for (let j = i + 1; j < shuffled.length; j++) {
                if (shuffled[j].name !== shuffled[i].name) {
                  // Check if swapping j to i causes conflict at i? No, we checked shuffled[j] != shuffled[i].
                  // Check if putting shuffled[i] at j causes conflict with j+1? (and j-1, but j-1 is... i... or in between)
                  // Let's just swap.
                  const temp = shuffled[i]
                  shuffled[i] = shuffled[j]
                  shuffled[j] = temp
                  swapped = true
                  break
                }
              }
              // If not swapped (tail end clump), try swapping with something behind? (i-2, etc)
              // Or just leave it.
            }
          }
          newWords = shuffled
        } else {
          newWords = selectedWords
        }
      }
    } else {
      newWords = []
    }

    // 记录原始 index, 并对 word.trans 做兜底处理
    return newWords.map((word, index) => {
      let trans: string[]
      if (Array.isArray(word.trans)) {
        trans = word.trans.filter((item) => typeof item === 'string')
      } else if (word.trans === null || word.trans === undefined || typeof word.trans === 'object') {
        trans = []
      } else {
        trans = [String(word.trans)]
      }
      return {
        ...word,
        index,
        trans,
      }
    })
  }, [isFirstChapter, isReviewMode, wordList, reviewRecord?.words, selectedChapters, errorWords, currentDictInfo, loopWordConfig.times])

  const isLoading = selectedChapters.includes(-2) || selectedChapters.includes(-3) ? isDatabaseLoading : isSwrLoading

  return { words, isLoading, error: swrError }
}

const firstChapter = [
  { name: 'cancel', trans: ['取消， 撤销； 删去'], usphone: "'kænsl", ukphone: "'kænsl" },
  { name: 'explosive', trans: ['爆炸的； 极易引起争论的', '炸药'], usphone: "ɪk'splosɪv; ɪk'splozɪv", ukphone: "ɪk'spləusɪv" },
  { name: 'numerous', trans: ['众多的'], usphone: "'numərəs", ukphone: "'njuːmərəs" },
  { name: 'govern', trans: ['居支配地位， 占优势', '统治，治理，支配'], usphone: "'ɡʌvɚn", ukphone: "'gʌvn" },
  { name: 'analyse', trans: ['分析； 分解； 解析'], usphone: "'æn(ə)laɪz", ukphone: "'ænəlaɪz" },
  { name: 'discourage', trans: ['使泄气， 使灰心； 阻止， 劝阻'], usphone: "dɪs'kɝɪdʒ", ukphone: "dɪs'kʌrɪdʒ" },
  { name: 'resemble', trans: ['像， 类似于'], usphone: "rɪ'zɛmbl", ukphone: "rɪ'zembl" },
  {
    name: 'remote',
    trans: ['遥远的； 偏僻的； 关系疏远的； 脱离的； 微乎其微的； 孤高的， 冷淡的； 遥控的'],
    usphone: "rɪ'mot",
    ukphone: "rɪ'məut",
  },
  { name: 'salary', trans: ['薪金， 薪水'], usphone: "'sæləri", ukphone: "'sæləri" },
  { name: 'pollution', trans: ['污染， 污染物'], usphone: "pə'luʃən", ukphone: "pə'luːʃn" },
  { name: 'pretend', trans: ['装作， 假装'], usphone: "prɪ'tɛnd", ukphone: "prɪ'tend" },
  { name: 'kettle', trans: ['水壶'], usphone: "'kɛtl", ukphone: "'ketl" },
  { name: 'wreck', trans: ['失事；残骸；精神或身体已垮的人', '破坏'], usphone: 'rɛk', ukphone: 'rek' },
  { name: 'drunk', trans: ['醉的； 陶醉的'], usphone: 'drʌŋk', ukphone: 'drʌŋk' },
  { name: 'calculate', trans: ['计算； 估计； 计划'], usphone: "'kælkjulet", ukphone: "'kælkjuleɪt" },
  { name: 'persistent', trans: ['坚持的， 不屈不挠的； 持续不断的； 反复出现的'], usphone: "pə'zɪstənt", ukphone: "pə'sɪstənt" },
  { name: 'sake', trans: ['缘故， 理由'], usphone: 'sek', ukphone: 'seɪk' },
  { name: 'conceal', trans: ['把…隐藏起来， 掩盖， 隐瞒'], usphone: "kən'sil", ukphone: "kən'siːl" },
  { name: 'audience', trans: ['听众， 观众， 读者'], usphone: "'ɔdɪəns", ukphone: "'ɔːdiəns" },
  { name: 'meanwhile', trans: ['与此同时'], usphone: "'minwaɪl", ukphone: "'miːnwaɪl" },
]
