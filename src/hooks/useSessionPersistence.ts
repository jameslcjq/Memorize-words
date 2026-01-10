import { TypingStateActionType, type TypingStateAction } from '@/pages/Typing/store'
import type { TypingState } from '@/pages/Typing/store/type'
import { currentChapterAtom, currentDictIdAtom, exerciseModeAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'

const SESSION_STORAGE_KEY = 'typing_session_backup'

interface SessionBackup {
  dictId: string
  chapter: number
  exerciseMode: string
  wordIndex: number
  userInputLogs: TypingState['chapterData']['userInputLogs']
  timerData: TypingState['timerData']
  timestamp: number
}

/**
 * Hook for persisting typing session to localStorage
 * Automatically saves progress and allows recovery after accidental refresh
 */
export function useSessionPersistence(state: TypingState, dispatch: (action: TypingStateAction) => void) {
  const currentDictId = useAtomValue(currentDictIdAtom)
  const currentChapter = useAtomValue(currentChapterAtom)
  const exerciseMode = useAtomValue(exerciseModeAtom)
  const hasRestoredRef = useRef(false)

  // Save session to localStorage
  const saveSession = useCallback(() => {
    // Only save if we have started and have progress
    if (!state.isTyping && state.chapterData.index === 0 && state.chapterData.wordCount === 0) {
      return
    }

    // Don't save finished sessions
    if (state.isFinished) {
      return
    }

    const backup: SessionBackup = {
      dictId: currentDictId,
      chapter: currentChapter,
      exerciseMode: exerciseMode,
      wordIndex: state.chapterData.index,
      userInputLogs: state.chapterData.userInputLogs,
      timerData: state.timerData,
      timestamp: Date.now(),
    }

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(backup))
    } catch (error) {
      console.warn('Failed to save session backup:', error)
    }
  }, [state, currentDictId, currentChapter, exerciseMode])

  // Clear saved session
  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear session backup:', error)
    }
  }, [])

  // Get saved session
  const getSavedSession = useCallback((): SessionBackup | null => {
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!saved) return null

      const backup = JSON.parse(saved) as SessionBackup

      // Check if backup is valid (not older than 24 hours)
      const age = Date.now() - backup.timestamp
      if (age > 24 * 60 * 60 * 1000) {
        clearSession()
        return null
      }

      return backup
    } catch (error) {
      console.warn('Failed to read session backup:', error)
      return null
    }
  }, [clearSession])

  // Check if there's a restorable session
  const hasRestorableSession = useCallback((): boolean => {
    const backup = getSavedSession()
    if (!backup) return false

    // Check if backup matches current context
    return (
      backup.dictId === currentDictId && backup.chapter === currentChapter && backup.exerciseMode === exerciseMode && backup.wordIndex > 0
    )
  }, [getSavedSession, currentDictId, currentChapter, exerciseMode])

  // Restore session - returns true if restored
  const restoreSession = useCallback((): boolean => {
    if (hasRestoredRef.current) return false

    const backup = getSavedSession()
    if (!backup) return false

    // Check if backup matches current context
    if (backup.dictId !== currentDictId || backup.chapter !== currentChapter || backup.exerciseMode !== exerciseMode) {
      return false
    }

    hasRestoredRef.current = true

    // Dispatch action to restore state using SKIP_2_WORD_INDEX
    dispatch({
      type: TypingStateActionType.SKIP_2_WORD_INDEX,
      newIndex: backup.wordIndex,
    })

    console.log(`已恢复练习进度: 第 ${backup.wordIndex + 1} 个单词`)
    return true
  }, [getSavedSession, currentDictId, currentChapter, exerciseMode, dispatch])

  // Auto-save on state changes (debounced via interval)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (state.isTyping || state.chapterData.wordCount > 0) {
        saveSession()
      }
    }, 5000) // Save every 5 seconds

    return () => clearInterval(intervalId)
  }, [saveSession, state.isTyping, state.chapterData.wordCount])

  // Save on beforeunload (page refresh/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveSession()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveSession])

  // Save when word changes
  useEffect(() => {
    if (state.chapterData.index > 0) {
      saveSession()
    }
  }, [state.chapterData.index, saveSession])

  // Clear session when finished
  useEffect(() => {
    if (state.isFinished) {
      clearSession()
    }
  }, [state.isFinished, clearSession])

  return {
    saveSession,
    clearSession,
    restoreSession,
    hasRestorableSession,
    getSavedSession,
  }
}
