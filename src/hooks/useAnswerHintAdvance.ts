import { ANSWER_HINT_SUCCESS_MS } from '@/constants/game'
import { useCallback, useEffect, useRef } from 'react'

type Options = {
  isSuccess: boolean
  isWrong: boolean
  wrongDuration: number
  onSuccess: () => void
  onWrong: () => void
}

export function useAnswerHintAdvance({ isSuccess, isWrong, wrongDuration, onSuccess, onWrong }: Options) {
  const completedRef = useRef(false)
  const onSuccessRef = useRef(onSuccess)
  const onWrongRef = useRef(onWrong)

  useEffect(() => {
    onSuccessRef.current = onSuccess
    onWrongRef.current = onWrong
  }, [onSuccess, onWrong])

  const advance = useCallback(() => {
    if (completedRef.current || (!isSuccess && !isWrong)) return
    completedRef.current = true
    if (isSuccess) onSuccessRef.current()
    else onWrongRef.current()
  }, [isSuccess, isWrong])

  useEffect(() => {
    completedRef.current = false
    if (!isSuccess && !isWrong) return

    const timer = window.setTimeout(advance, isSuccess ? ANSWER_HINT_SUCCESS_MS : wrongDuration)
    const skip = (event: KeyboardEvent | MouseEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Enter') return
      if (event instanceof KeyboardEvent) event.preventDefault()
      advance()
    }
    window.addEventListener('keydown', skip)
    window.addEventListener('click', skip)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', skip)
      window.removeEventListener('click', skip)
    }
  }, [advance, isSuccess, isWrong, wrongDuration])

  return advance
}
