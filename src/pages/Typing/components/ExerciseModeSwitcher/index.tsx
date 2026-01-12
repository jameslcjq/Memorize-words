import Tooltip from '@/components/Tooltip'
import { exerciseModeAtom, quizConfigAtom } from '@/store'
import type { ExerciseMode, QuizScope } from '@/typings'
import { Listbox, Transition } from '@headlessui/react'
import { useAtom } from 'jotai'
import { Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import IconCheck from '~icons/tabler/check'
import IconChevronDown from '~icons/tabler/chevron-down'

export const ExerciseModeSwitcher = () => {
  const [mode, setMode] = useAtom(exerciseModeAtom)
  const [quizConfig, setQuizConfig] = useAtom(quizConfigAtom)
  const navigate = useNavigate()

  const modes: { id: ExerciseMode; name: string }[] = [
    { id: 'smartLearning', name: '智能学习' },
    { id: 'speller', name: '单词填空' },
    { id: 'dictation', name: '听写单词' },
    { id: 'word-to-trans', name: '英译中' },
    { id: 'trans-to-word', name: '中译英' },
    { id: 'crossword', name: '填字闯关' },
  ]

  const scopes: { id: QuizScope; name: string }[] = [
    { id: 'unit', name: '当前单元' },
    { id: 'dict', name: '整个词库' },
  ]

  const handleModeChange = (newMode: ExerciseMode) => {
    setMode(newMode)
    if (newMode === 'smartLearning') {
      navigate('/smart-learning')
    } else {
      // 这里的逻辑可能需要根据实际情况调整，例如如果已经在 smart-learning 页面，可能需要跳转回 typing
      navigate('/typing')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* 练习模式切换 */}
      <Tooltip content="切换练习模式">
        <Listbox value={mode} onChange={handleModeChange}>
          <div className="relative">
            <Listbox.Button className="flex items-center gap-1 rounded-lg border border-transparent px-3 py-1 text-lg text-gray-700 transition-colors duration-300 ease-in-out hover:border-indigo-400 hover:bg-indigo-400 hover:text-white focus:outline-none dark:text-white dark:text-opacity-60 dark:hover:text-opacity-100">
              <span>{modes.find((m) => m.id === mode)?.name}</span>
              <IconChevronDown className="h-4 w-4 opacity-50" />
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="listbox-options z-20 w-36">
                {modes.map((m) => (
                  <Listbox.Option key={m.id} value={m.id}>
                    {({ selected }) => (
                      <div className="group flex cursor-pointer items-center justify-between">
                        {selected ? (
                          <span className="listbox-options-icon">
                            <IconCheck />
                          </span>
                        ) : null}
                        <span>{m.name}</span>
                      </div>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      </Tooltip>
    </div>
  )
}
