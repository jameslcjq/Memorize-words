import type { WritableAtom } from 'jotai'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { RESET } from 'jotai/vanilla/utils/constants'
import { offlineStorage } from '@/lib/offlineStorage'

type SetStateActionWithReset<Value> = Value | typeof RESET | ((prev: Value) => Value | typeof RESET)

export default function atomForConfig<T extends Record<string, unknown>>(
  key: string,
  defaultValue: T,
): WritableAtom<T, [SetStateActionWithReset<T>], void> {
  const storageAtom = atomWithStorage(key, defaultValue, {
    getItem: (storageKey, initialValue) => {
      const value = offlineStorage.getItem(storageKey)
      return value ? (JSON.parse(value) as T) : initialValue
    },
    setItem: (storageKey, value) => offlineStorage.setItem(storageKey, JSON.stringify(value)),
    removeItem: (storageKey) => offlineStorage.removeItem(storageKey),
  })
  return atom((get) => {
    // Get the underlying object
    const config = get(storageAtom)

    let newConfig: T

    // Check if the types are different
    const isTypeMismatch = typeof config !== typeof defaultValue

    if (isTypeMismatch) {
      newConfig = defaultValue
    } else {
      // Check if there are missing properties
      let hasMissingProperty = false
      for (const key in defaultValue) {
        if (!(key in config)) {
          hasMissingProperty = true
          break
        }
      }

      newConfig = hasMissingProperty ? { ...defaultValue, ...config } : config
    }

    if (newConfig !== config) {
      const jsonString = JSON.stringify(newConfig)
      offlineStorage.setItem(key, jsonString)
    }

    return newConfig
  }, storageAtom.write)
}
