import { pronunciationConfigAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'

function getSpeechSynthesis(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

export default function usePronunciationSound(word: string, _isLoop = false) {
  void _isLoop
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)

  const [isPlaying, setIsPlaying] = useState(false)

  // Keep track of the current utterance to handle stops/unmounts
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const play = useCallback(() => {
    const synth = getSpeechSynthesis()
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return

    // Cancel any ongoing speech to avoid queue buildup or overlapping
    synth.cancel()

    const u = new SpeechSynthesisUtterance(word)

    // Map configuration to BCP 47 language tags
    // 'uk' -> 'en-GB', 'us' -> 'en-US', 'ja' -> 'ja-JP', 'zh' -> 'zh-CN', etc.
    let lang = 'en-US'
    switch (pronunciationConfig.type) {
      case 'uk':
        lang = 'en-GB'
        break
      case 'us':
        lang = 'en-US'
        break
      case 'ja':
      case 'romaji':
        lang = 'ja-JP'
        break
      case 'zh':
        lang = 'zh-CN'
        break
      case 'de':
        lang = 'de-DE'
        break
      case 'id':
        lang = 'id-ID'
        break
      // Fallbacks
      case 'hapin':
      case 'kk':
        lang = 'ru-RU'
        break
      default:
        lang = 'en-US'
    }

    u.lang = lang
    u.rate = pronunciationConfig.rate || 1
    u.volume = pronunciationConfig.volume || 1

    u.onstart = () => setIsPlaying(true)
    u.onend = () => setIsPlaying(false)
    u.onerror = () => setIsPlaying(false)

    utteranceRef.current = u
    synth.speak(u)
  }, [word, pronunciationConfig.type, pronunciationConfig.rate, pronunciationConfig.volume])

  const stop = useCallback(() => {
    getSpeechSynthesis()?.cancel()
    setIsPlaying(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      getSpeechSynthesis()?.cancel()
    }
  }, [])

  return { play, stop, isPlaying }
}

// Prefetch does nothing for Web Speech API as it's generated on the fly.
// We keep the hook definition to avoid breaking call sites, but make it no-op.
export function usePrefetchPronunciationSound(_word: string | undefined) {
  void _word
  // No-op
}
