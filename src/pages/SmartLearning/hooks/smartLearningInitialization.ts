export function getSmartLearningInitializationKey(dict: string, chapter: number, wordCount: number): string | null {
  return wordCount > 0 ? `${dict}:${chapter}` : null
}
