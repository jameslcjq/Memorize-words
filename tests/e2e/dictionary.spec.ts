import { test, expect } from '@playwright/test'

test.describe('Dictionary manage', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('currentDict', JSON.stringify('Yilin9A'))
      localStorage.setItem('selectedChapters', JSON.stringify([0]))
    })
    await page.goto('/index.html')
    const closeHint = page.getByLabel('关闭提示')
    if (await closeHint.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeHint.click()
    }
  })

  test('Homepage default dictionary', async ({ page }) => {
    await expect(page.getByText('译林版初中英语9A')).toBeVisible()

    await page.getByText('译林版初中英语9A').hover()
    await expect(await page.getByText('词典切换').isVisible()).toBeTruthy()
  })

  test('Open gallery and select dictionary chapter', async ({ page }) => {
    await page.getByText('译林版初中英语9A').click()
    await page.waitForURL('**/gallery')

    await page.getByRole('button', { name: /译林版小学英语3A/ }).click()
    await page.getByText('第 2 单元').click()

    await page.waitForURL('**/')
    await expect(page.getByText('译林版小学英语3A')).toBeVisible()
    await expect(page.getByRole('button', { name: '第 2 单元' }).first()).toBeVisible()
  })

  test('Close dictionary settings', async ({ page }) => {
    await page.getByText('译林版初中英语9A').click()
    await page.waitForURL('**/gallery')
    await page.locator('svg').first().click()

    await page.waitForURL('**/')
    await expect(page.locator('h1').getByText('老九背单词')).toBeVisible()
  })

  test('Switch dictionary chapter', async ({ page }) => {
    await page.getByText('第 1 单元').first().hover()
    await expect(await page.getByText('单元切换').isVisible()).toBeTruthy()

    await page.getByText('第 1 单元').click()
    await page.getByRole('option', { name: '第 2 单元' }).click()

    await page.getByText('第 2 单元').first().hover()
    await expect(await page.getByText('单元切换').isVisible()).toBeTruthy()
  })
})
