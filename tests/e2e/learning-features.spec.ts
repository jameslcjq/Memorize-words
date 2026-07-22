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

test('pattern browser starts a temporary family practice', async ({ page }) => {
  await seedOfflineSettings(page, { currentDict: 'Yilin3A', selectedChapters: [0], exerciseMode: 'speller' })
  await page.goto('/patterns')

  await expect(page.getByRole('heading', { name: '规律浏览' })).toBeVisible()
  await page.getByRole('button', { name: '词族' }).click()
  const practiceButton = page.getByRole('button', { name: '练习这组' }).first()
  await expect(practiceButton).toBeVisible()
  await practiceButton.click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText(/规律练习/).first()).toBeVisible()
})

test('pet color can be previewed and changed immediately', async ({ page }) => {
  const pet = {
    species: 'cat',
    name: '测试猫',
    level: 2,
    exp: 10,
    stage: 'baby',
    mood: 80,
    hunger: 80,
    cleanliness: 80,
    outfitJson: '[]',
    lastInteractedAt: Date.now(),
    createdAt: Date.now(),
    color: 'natural',
  }
  await seedOfflineSettings(page, {
    'cloud-state:v1:guest': {
      version: 1,
      pointsTransactions: [],
      unlockedAchievements: [],
      dailyChallenges: [],
      pet,
      petInventory: [],
      hasPet: true,
    },
  })
  await page.goto('/pet')

  await expect(page.getByRole('heading', { name: '外观' })).toBeVisible()
  await page.getByRole('radio', { name: '晴蓝' }).click()
  await expect(page.getByTitle('测试猫 · 晴蓝')).toBeVisible()
})
