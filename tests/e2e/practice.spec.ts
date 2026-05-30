import { expect, test, type Page } from '@playwright/test'

async function pressWord(page: Page, word: string) {
  for (const letter of word) {
    await page.keyboard.press(letter)
  }
}

test.describe('Practice', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('currentDict', JSON.stringify('Yilin9A'))
      localStorage.setItem('selectedChapters', JSON.stringify([0]))
      localStorage.setItem('exerciseMode', JSON.stringify('typing'))
    })
    await page.goto('/index.html')
    const closeHint = page.getByLabel('关闭提示')
    if (await closeHint.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeHint.click()
    }
  })

  test('Press a word key to start', async ({ page }) => {
    await expect(page.getByText('按任意键开始')).toBeVisible()

    await page.keyboard.press('f')

    await expect(page.getByText('按任意键开始')).toBeHidden()
  })

  test('Enter the correct word and advance', async ({ page }) => {
    await pressWord(page, 'flashcard')

    await expect(page.getByText('词汇')).toBeVisible()
  })
})
