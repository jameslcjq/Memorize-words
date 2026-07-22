import { expect, test, type Page } from '@playwright/test'

async function seedOfflineSettings(page: Page, settings: Record<string, unknown>) {
  await page.addInitScript(async (values) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('memorize-offline', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('key-value')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const transaction = request.result.transaction('key-value', 'readwrite')
        const store = transaction.objectStore('key-value')
        Object.entries(values).forEach(([key, value]) => store.put(JSON.stringify(value), key))
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      }
    })
  }, settings)
}

test('special chapter and smart-learning mode do not ping-pong between routes', async ({ page }) => {
  await seedOfflineSettings(page, {
    currentDict: 'Yilin3A',
    selectedChapters: [-2],
    exerciseMode: 'smartLearning',
  })

  await page.goto('/smart-learning')
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  await page.waitForTimeout(1_500)
  await expect(page).toHaveURL(/\/$/)
})
