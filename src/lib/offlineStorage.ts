const DB_NAME = 'memorize-offline'
const STORE_NAME = 'key-value'
const DB_VERSION = 1

const memory = new Map<string, string>()
const dirtyCloudSettings = new Set<string>()
let database: IDBDatabase | null = null

const CLOUD_SETTING_KEYS = new Set([
  'currentDict',
  'selectedChapters',
  'exerciseMode',
  'learningPlan',
  'loopWordConfig',
  'pronunciation',
  'phoneticConfig',
  'randomConfig',
  'wordDictationConfig',
  'isOpenDarkModeAtom',
])

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function initOfflineStorage(): Promise<void> {
  database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database!.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).openCursor()
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return resolve()
      if (typeof cursor.key === 'string' && typeof cursor.value === 'string') memory.set(cursor.key, cursor.value)
      cursor.continue()
    }
    request.onerror = () => reject(request.error)
  })
}

function persist(method: 'put' | 'delete', key: string, value?: string) {
  if (!database) return
  const store = database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME)
  if (method === 'put') store.put(value, key)
  else store.delete(key)
}

/** Synchronous facade backed by IndexedDB. initOfflineStorage must run before React mounts. */
export const offlineStorage: Storage = {
  get length() {
    return memory.size
  },
  clear() {
    memory.clear()
    if (database) database.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).clear()
  },
  getItem(key: string) {
    return memory.get(key) ?? null
  },
  key(index: number) {
    return [...memory.keys()][index] ?? null
  },
  removeItem(key: string) {
    memory.delete(key)
    persist('delete', key)
  },
  setItem(key: string, value: string) {
    memory.set(key, String(value))
    if (CLOUD_SETTING_KEYS.has(key)) dirtyCloudSettings.add(key)
    persist('put', key, String(value))
  },
}

export function setOfflineValueFromCloud(key: string, value: string) {
  memory.set(key, value)
  dirtyCloudSettings.delete(key)
  persist('put', key, value)
}

export function hasDirtyCloudSettings() {
  return dirtyCloudSettings.size > 0
}

export function markCloudSettingsSynced() {
  dirtyCloudSettings.clear()
}
