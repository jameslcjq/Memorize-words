// Focus Monitor Hook - Anti-procrastination/Distraction tracking
import { useCallback, useEffect, useRef, useState } from 'react'

interface FocusState {
  totalAwayMs: number
  isAway: boolean
  sessionStartTime: number
}

const getStorageKey = () => `study_away_time_${new Date().toISOString().split('T')[0]}`

export function useFocusMonitor() {
  const [state, setState] = useState<FocusState>({
    totalAwayMs: 0,
    isAway: false,
    sessionStartTime: Date.now(),
  })
  const lastLeaveTimeRef = useRef<number | null>(null)
  const isAwayRef = useRef(false)

  // Load from localStorage on mount
  useEffect(() => {
    const key = getStorageKey()
    const saved = localStorage.getItem(key)
    if (saved) {
      const parsed = parseInt(saved, 10)
      if (!isNaN(parsed)) {
        setState((prev) => ({ ...prev, totalAwayMs: parsed }))
      }
    }
  }, [])

  // Save to localStorage whenever totalAwayMs changes
  const saveData = useCallback((ms: number) => {
    const key = getStorageKey()
    localStorage.setItem(key, ms.toString())
  }, [])

  // Handle leaving (page hidden or window blur)
  const handleLeave = useCallback(() => {
    if (isAwayRef.current) return

    isAwayRef.current = true
    lastLeaveTimeRef.current = Date.now()
    setState((prev) => ({ ...prev, isAway: true }))

    console.log('[FocusMonitor] 离开学习')
  }, [])

  // Handle returning (page visible or window focus)
  const handleBack = useCallback(() => {
    if (!isAwayRef.current || lastLeaveTimeRef.current === null) return

    const now = Date.now()
    const duration = now - lastLeaveTimeRef.current

    // Filter out very short durations (< 1 second) - likely false positives
    if (duration > 1000) {
      setState((prev) => {
        const newTotal = prev.totalAwayMs + duration
        saveData(newTotal)
        console.log(`[FocusMonitor] 回到学习，本次离开: ${(duration / 1000).toFixed(1)}秒`)
        return { ...prev, totalAwayMs: newTotal, isAway: false }
      })
    } else {
      setState((prev) => ({ ...prev, isAway: false }))
    }

    isAwayRef.current = false
    lastLeaveTimeRef.current = null
  }, [saveData])

  // Bind event listeners
  useEffect(() => {
    // Page Visibility API - detects home button, lock screen, tab switch
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleLeave()
      } else {
        handleBack()
      }
    }

    // Window focus/blur - detects split screen on iPad
    const handleWindowBlur = () => {
      // Delay to filter out brief focus losses from clicking iframes
      setTimeout(() => {
        if (!document.hasFocus()) {
          handleLeave()
        }
      }, 500)
    }

    const handleWindowFocus = () => {
      handleBack()
    }

    // Save data before page unload
    const handlePageHide = () => {
      if (isAwayRef.current && lastLeaveTimeRef.current !== null) {
        const duration = Date.now() - lastLeaveTimeRef.current
        const newTotal = state.totalAwayMs + duration
        saveData(newTotal)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [handleLeave, handleBack, saveData, state.totalAwayMs])

  // Format time for display
  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${hours}小时${minutes}分${seconds}秒`
    }
    return `${minutes}分${seconds}秒`
  }, [])

  // Calculate session duration
  const getSessionDuration = useCallback(() => {
    return Date.now() - state.sessionStartTime
  }, [state.sessionStartTime])

  // Calculate focus percentage
  const getFocusPercentage = useCallback(() => {
    const sessionDuration = getSessionDuration()
    if (sessionDuration === 0) return 100
    const focusTime = sessionDuration - state.totalAwayMs
    return Math.max(0, Math.round((focusTime / sessionDuration) * 100))
  }, [getSessionDuration, state.totalAwayMs])

  // Reset today's stats
  const resetToday = useCallback(() => {
    const key = getStorageKey()
    localStorage.removeItem(key)
    setState((prev) => ({
      ...prev,
      totalAwayMs: 0,
      sessionStartTime: Date.now(),
    }))
  }, [])

  return {
    totalAwayMs: state.totalAwayMs,
    isAway: state.isAway,
    formattedAwayTime: formatTime(state.totalAwayMs),
    sessionDuration: getSessionDuration(),
    focusPercentage: getFocusPercentage(),
    resetToday,
  }
}
