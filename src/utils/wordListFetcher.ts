import type { Word } from '@/typings'

export async function wordListFetcher(url: string): Promise<Word[]> {
  const baseUrl = import.meta.env.BASE_URL || '/'
  const resourcePath = url.startsWith('/') ? url.slice(1) : url

  const response = await fetch(new URL(resourcePath, window.location.origin + baseUrl))
  const words: Word[] = await response.json()
  return words
}
