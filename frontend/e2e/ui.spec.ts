import { test, expect } from '@playwright/test'

test.describe('Campaign Data Hub UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/health')
    const ingestBtn = page.getByRole('button', { name: 'Run ingest' })
    if (await ingestBtn.isVisible()) {
      await ingestBtn.click()
      await page.waitForTimeout(1500)
    }
  })

  test('metrics page loads with table and totals', async ({ page }) => {
    await page.goto('/metrics')
    await expect(page.getByRole('heading', { name: 'Campaign metrics' })).toBeVisible()
    await expect(page.getByText('Spend (USD)')).toBeVisible()
    await expect(page.locator('table tbody tr').first()).toBeVisible()
  })

  test('health page shows deliveries and drill-down', async ({ page }) => {
    await page.goto('/health')
    await expect(page.getByRole('heading', { name: 'Data health' })).toBeVisible()
    await expect(page.locator('table tbody tr').first()).toBeVisible()
    await page.locator('table tbody tr').first().click()
    await expect(page.getByText('Quality checks')).toBeVisible()
  })
})
