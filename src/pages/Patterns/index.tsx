import Layout from '@/components/Layout'
import { currentDictInfoAtom, exerciseModeAtom, practiceWordListAtom, selectedChaptersAtom } from '@/store'
import type { Word } from '@/typings'
import { wordListFetcher } from '@/utils/wordListFetcher'
import { useSetAtom, useAtomValue } from 'jotai'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'

type PatternType = 'phonics' | 'family' | 'affix'
type PatternGroup = { key: string; label: string; words: Word[] }

export default function PatternsPage() {
  const navigate = useNavigate()
  const dict = useAtomValue(currentDictInfoAtom)
  const setPracticeWords = useSetAtom(practiceWordListAtom)
  const setSelectedChapters = useSetAtom(selectedChaptersAtom)
  const setExerciseMode = useSetAtom(exerciseModeAtom)
  const [type, setType] = useState<PatternType>('phonics')
  const { data: words, isLoading } = useSWR(dict.url, wordListFetcher, { revalidateOnFocus: false })

  const groups = useMemo<PatternGroup[]>(() => {
    const grouped = new Map<string, Word[]>()
    for (const word of words || []) {
      let keys: string[] = []
      if (type === 'phonics') keys = word.phonics || []
      if (type === 'family' && word.wordFamily) keys = [word.wordFamily]
      if (type === 'affix') {
        keys = [
          word.morph?.prefix?.text ? `${word.morph.prefix.text}-` : '',
          word.morph?.suffix?.text ? `-${word.morph.suffix.text}` : '',
        ].filter(Boolean)
      }
      keys.forEach((key) => grouped.set(key, [...(grouped.get(key) || []), word]))
    }
    return [...grouped.entries()]
      .map(([key, groupWords]) => ({ key, label: key, words: groupWords }))
      .filter((group) => group.words.length >= 2)
      .sort((a, b) => b.words.length - a.words.length || a.key.localeCompare(b.key))
  }, [type, words])

  const startPractice = (group: PatternGroup) => {
    setPracticeWords({ label: `${group.label} 规律练习`, words: group.words })
    setSelectedChapters([-3])
    setExerciseMode('speller')
    navigate('/typing')
  }

  return (
    <Layout>
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-y-auto px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">规律浏览</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{dict.name} · 按拼读点、词族和词缀归组学习</p>
          </div>
          <button
            className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={() => navigate('/gallery')}
          >
            返回词库
          </button>
        </div>

        <div className="mb-6 flex gap-2">
          {(
            [
              ['phonics', '拼读点'],
              ['family', '词族'],
              ['affix', '词缀'],
            ] as Array<[PatternType, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setType(value)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                type === value ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="py-16 text-center text-gray-500">正在整理规律...</p>
        ) : groups.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-8 text-center text-gray-500 dark:bg-gray-800">当前词库还没有可用的规律标注</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <section
                key={group.key}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-indigo-600 dark:text-indigo-300">{group.label}</h2>
                  <button
                    onClick={() => startPractice(group)}
                    className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
                  >
                    练习这组
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.words.map((word) => (
                    <span
                      key={word.name}
                      className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                      title={word.trans.join('；')}
                    >
                      {word.name}
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
