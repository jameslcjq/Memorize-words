import Layout from '../../components/Layout'
import CrosswordGame from './components/CrosswordGame'
import { DictChapterButton } from './components/DictChapterButton'
import DictationGame from './components/DictationGame'
import { ExerciseModeSwitcher } from './components/ExerciseModeSwitcher'
import PronunciationSwitcher from './components/PronunciationSwitcher'
import ResultScreen from './components/ResultScreen'
import Speed from './components/Speed'
import SpellerGame from './components/SpellerGame'
import StartButton from './components/StartButton'
import Switcher from './components/Switcher'
import VirtualKeyboard from './components/VirtualKeyboard'
import WordPanel from './components/WordPanel'
import { useConfetti } from './hooks/useConfetti'
import { useWordList } from './hooks/useWordList'
import { TypingContext, TypingStateActionType, initialState, typingReducer } from './store'
import AchievementToast from '@/components/AchievementToast'
import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import Tooltip from '@/components/Tooltip'
import { useGamification } from '@/hooks/useGamification'
import { useSessionPersistence } from '@/hooks/useSessionPersistence'
import { idDictionaryMap } from '@/resources/dictionary'
import {
  currentChapterAtom,
  currentDictIdAtom,
  exerciseModeAtom,
  isReviewModeAtom,
  randomConfigAtom,
  reviewModeInfoAtom,
  wordDictationConfigAtom,
} from '@/store'
import { IsDesktop, isLegal } from '@/utils'
import { useSaveChapterRecord, useSaveWordRecord } from '@/utils/db'
import { useMixPanelChapterLogUploader } from '@/utils/mixpanel'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useImmerReducer } from 'use-immer'

const App: React.FC = () => {
  const [state, dispatch] = useImmerReducer(typingReducer, structuredClone(initialState))
  const { words, isLoading } = useWordList()

  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)
  const randomConfig = useAtomValue(randomConfigAtom)
  const chapterLogUploader = useMixPanelChapterLogUploader(state)
  const saveChapterRecord = useSaveChapterRecord()
  const saveWordRecord = useSaveWordRecord()

  const reviewModeInfo = useAtomValue(reviewModeInfoAtom)
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const [wordDictationConfig, setWordDictationConfig] = useAtom(wordDictationConfigAtom)
  const exerciseMode = useAtomValue(exerciseModeAtom)

  // Gamification
  const { awardChapterPoints, checkAchievements, newlyUnlockedAchievement, clearAchievementToast } = useGamification()

  // Session Persistence (auto-save for accidental refresh recovery)
  const { restoreSession, hasRestorableSession } = useSessionPersistence(state, dispatch)

  // Enforce defaults for "Back-Recite" (typing mode)
  useEffect(() => {
    if (exerciseMode === 'typing') {
      // Force Definition Visible
      if (!state.isTransVisible) {
        dispatch({ type: TypingStateActionType.TOGGLE_TRANS_VISIBLE })
      }
      // Force Dictation Mode (Recitation) ON
      if (!wordDictationConfig.isOpen) {
        setWordDictationConfig((prev) => ({ ...prev, isOpen: true, type: 'hideAll' }))
      }
    }
  }, [exerciseMode, state.isTransVisible, wordDictationConfig.isOpen, dispatch, setWordDictationConfig])

  useEffect(() => {
    // 检测用户设备
    if (!IsDesktop()) {
      setTimeout(() => {
        alert('不支持手机端访问，请使用 iPad 或 电脑打开')
      }, 500)
    }
  }, [])

  // 在组件挂载和currentDictId改变时，检查当前字典是否存在，如果不存在，则将其重置为默认值
  useEffect(() => {
    const id = currentDictId
    if (!(id in idDictionaryMap)) {
      setCurrentDictId('cet4')
      setCurrentChapter(0)
      return
    }
  }, [currentDictId, setCurrentChapter, setCurrentDictId])

  const skipWord = useCallback(() => {
    const currentWordIndex = state.chapterData.index
    const userInputLog = state.chapterData.userInputLogs[currentWordIndex]

    if (userInputLog && userInputLog.wrongCount > 0) {
      const currentWord = state.chapterData.words[currentWordIndex]
      // Save the record
      saveWordRecord({
        word: currentWord.name,
        wrongCount: userInputLog.wrongCount,
        letterTimeArray: [],
        letterMistake: userInputLog.LetterMistakes,
      })
    }
    dispatch({ type: TypingStateActionType.SKIP_WORD })
  }, [dispatch, saveWordRecord, state.chapterData.index, state.chapterData.userInputLogs, state.chapterData.words])

  // Auto-skip when wrong count reaches 3
  useEffect(() => {
    const currentWordIndex = state.chapterData.index
    const userInputLog = state.chapterData.userInputLogs[currentWordIndex]
    if (userInputLog && userInputLog.wrongCount >= 3) {
      skipWord()
    }
  }, [state.chapterData.index, state.chapterData.userInputLogs, skipWord])

  useEffect(() => {
    const onBlur = () => {
      dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: false })
    }
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('blur', onBlur)
    }
  }, [dispatch])

  /* setIsLoading useEffect removed */

  useEffect(() => {
    if (!state.isTyping) {
      const onKeyDown = (e: KeyboardEvent) => {
        if (!isLoading && e.key !== 'Enter' && (isLegal(e.key) || e.key === ' ') && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          dispatch({ type: TypingStateActionType.SET_IS_TYPING, payload: true })
        }
      }
      window.addEventListener('keydown', onKeyDown)

      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [state.isTyping, isLoading, dispatch])

  useEffect(() => {
    if (words !== undefined) {
      const initialIndex = isReviewMode && reviewModeInfo.reviewRecord?.index ? reviewModeInfo.reviewRecord.index : 0

      dispatch({
        type: TypingStateActionType.SETUP_CHAPTER,
        payload: { words, shouldShuffle: randomConfig.isOpen || exerciseMode === 'speller', initialIndex },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words, exerciseMode])

  useEffect(() => {
    // 当用户完成章节后且完成 word Record 数据保存，记录 chapter Record 数据,
    if (state.isFinished && !state.isSavingRecord) {
      chapterLogUploader()
      saveChapterRecord(state)

      // Award gamification points
      const isPerfect = state.chapterData.wrongCount === 0 && state.chapterData.wordCount > 0
      awardChapterPoints(isPerfect).then(() => {
        checkAchievements()
      })
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isFinished, state.isSavingRecord])

  useEffect(() => {
    // 启动计时器
    let intervalId: number
    if (state.isTyping) {
      intervalId = window.setInterval(() => {
        dispatch({ type: TypingStateActionType.TICK_TIMER })
      }, 1000)
    }
    return () => clearInterval(intervalId)
  }, [state.isTyping, dispatch])

  useConfetti(state.isFinished)

  return (
    <TypingContext.Provider value={{ state: state, dispatch }}>
      {/* Achievement Toast */}
      <AchievementToast achievement={newlyUnlockedAchievement} onClose={clearAchievementToast} />

      {state.isFinished && <ResultScreen />}
      <Layout>
        <Header>
          <DictChapterButton />
          <ExerciseModeSwitcher />
          <PronunciationSwitcher />
          <Switcher />
          <LoginModal />
          <StartButton isLoading={isLoading} />
          <Tooltip content="跳过该词">
            <button
              className={`${
                state.isShowSkip ? 'bg-orange-400' : 'invisible w-0 bg-gray-300 px-0 opacity-0'
              } my-btn-primary transition-all duration-300 `}
              onClick={skipWord}
            >
              Skip
            </button>
          </Tooltip>
        </Header>
        <div className="container mx-auto flex h-full flex-1 flex-col items-center justify-center pb-5">
          <div className="container relative mx-auto flex h-full flex-col items-center">
            <div className="container flex flex-grow items-center justify-center">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center ">
                  <div
                    className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid  border-indigo-400 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
                    role="status"
                  ></div>
                </div>
              ) : words.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-500 opacity-70">
                  <p className="text-xl">当前词库({currentDictId})暂无错题录入</p>
                  <p className="mt-2 text-sm italic">请在练习中产生错题后再来挑战，或切换到包含错题的词库</p>
                </div>
              ) : (
                !state.isFinished &&
                (exerciseMode === 'speller' ? (
                  <SpellerGame />
                ) : exerciseMode === 'dictation' ? (
                  <DictationGame />
                ) : exerciseMode === 'crossword' ? (
                  <CrosswordGame />
                ) : (
                  <WordPanel />
                ))
              )}
            </div>
            {!isLoading &&
              exerciseMode !== 'word-to-trans' &&
              exerciseMode !== 'trans-to-word' &&
              exerciseMode !== 'speller' &&
              exerciseMode !== 'dictation' &&
              exerciseMode !== 'crossword' && <VirtualKeyboard />}
          </div>
        </div>
      </Layout>
    </TypingContext.Provider>
  )
}

export default App
