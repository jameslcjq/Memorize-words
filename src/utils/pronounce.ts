/**
 * Utility functions for word pronunciation using Web Speech API
 */

/**
 * Pronounce a word using the browser's SpeechSynthesis API
 * @param word The word to pronounce
 * @param lang The language code (default: 'en-US' for English)
 */
export function pronounceWord(word: string, lang = 'en-US'): void {
  const synth = window.speechSynthesis

  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    console.error('SpeechSynthesis API is not supported in this browser')
    return
  }

  // Cancel any ongoing speech
  synth.cancel()

  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = lang
  utterance.rate = 0.9 // Slightly slower for clarity
  utterance.pitch = 1
  utterance.volume = 1

  synth.speak(utterance)
}

/**
 * Cancel any ongoing speech
 */
export function cancelSpeech(): void {
  const synth = window.speechSynthesis
  if (synth) {
    synth.cancel()
  }
}
