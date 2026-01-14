import { pronunciationConfigAtom } from '@/store'
import { Howl } from 'howler'
import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 获取发音 URL
 * 使用有道词典 API 获取单词发音
 */
function getPronunciationUrl(word: string, type: 'us' | 'uk' = 'us'): string {
  // 有道词典发音 API
  // type=1 英式, type=2 美式
  const voiceType = type === 'uk' ? 1 : 2
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${voiceType}`
}

/**
 * 快速发音 Hook - 使用 Howler.js 和有道词典 API
 *
 * 优化点：
 * 1. 使用 Howler.js 预加载音频
 * 2. 使用在线 API 而非 Web Speech API
 * 3. 音频缓存
 */
export function useFastPronunciation(word: string) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const howlRef = useRef<Howl | null>(null)

  // 预加载音频
  useEffect(() => {
    if (!word) return

    // 清理之前的音频
    if (howlRef.current) {
      howlRef.current.unload()
    }

    const type = pronunciationConfig.type === 'uk' ? 'uk' : 'us'
    const url = getPronunciationUrl(word, type)

    const howl = new Howl({
      src: [url],
      html5: true, // 使用 HTML5 Audio 以支持跨域
      volume: pronunciationConfig.volume || 1,
      rate: pronunciationConfig.rate || 1,
      preload: true,
      onload: () => {
        setIsLoaded(true)
      },
      onplay: () => {
        setIsPlaying(true)
      },
      onend: () => {
        setIsPlaying(false)
      },
      onstop: () => {
        setIsPlaying(false)
      },
      onloaderror: (id, error) => {
        console.error('Failed to load pronunciation:', error)
        setIsLoaded(false)
      },
    })

    howlRef.current = howl
    setIsLoaded(false)

    return () => {
      howl.unload()
    }
  }, [word, pronunciationConfig.type, pronunciationConfig.volume, pronunciationConfig.rate])

  const play = useCallback(() => {
    if (howlRef.current) {
      // 如果正在播放，先停止
      howlRef.current.stop()
      howlRef.current.play()
    }
  }, [])

  const stop = useCallback(() => {
    if (howlRef.current) {
      howlRef.current.stop()
    }
  }, [])

  return { play, stop, isPlaying, isLoaded }
}

/**
 * 预取发音 - 提前加载下一个单词的发音
 */
export function usePrefetchFastPronunciation(word: string | undefined) {
  const pronunciationConfig = useAtomValue(pronunciationConfigAtom)

  useEffect(() => {
    if (!word) return

    const type = pronunciationConfig.type === 'uk' ? 'uk' : 'us'
    const url = getPronunciationUrl(word, type)

    // 使用 Image 对象来预取（利用浏览器缓存）
    // 或者创建一个静默的 Howl 实例
    const howl = new Howl({
      src: [url],
      html5: true,
      preload: true,
      volume: 0, // 静默预加载
    })

    return () => {
      howl.unload()
    }
  }, [word, pronunciationConfig.type])
}
