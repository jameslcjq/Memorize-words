import { test, expect } from '@playwright/test'

test.describe('Theme switch', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html')
    const closeHint = page.getByLabel('关闭提示')
    if (await closeHint.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeHint.click()
    }
  })

  test('Has theme switch button', async ({ page }) => {
    await expect(page.getByLabel('开关深色模式')).toBeVisible()
  })

  test('Theme mode switch', async ({ page }) => {
    // light to dark
    await page.getByLabel('开关深色模式').click()
    await expect(await page.locator('html').getAttribute('class')).toBe('dark')

    await page.waitForTimeout(500)

    // dark to light
    await page.getByLabel('开关深色模式').click()
    await expect(await page.locator('html').getAttribute('class')).toBe('')
  })
})
