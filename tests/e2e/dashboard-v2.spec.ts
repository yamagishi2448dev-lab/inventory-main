import { test, expect } from '@playwright/test'

test.describe('Dashboard V2', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login')
        await page.fill('input[name="username"]', 'admin')
        await page.fill('input[name="password"]', 'password123')
        await page.click('button[type="submit"]')
        await page.waitForURL('/dashboard')
    })

    test('should display V2 stats cards', async ({ page }) => {
        await expect(page.getByText('商品総数')).toBeVisible()
        await expect(page.getByText('品目数')).toBeVisible()
        await expect(page.getByText('メーカー数')).toBeVisible()
        await expect(page.getByText('原価合計')).toBeVisible()
    })

    test('should display Cost By Manufacturer component', async ({ page }) => {
        await expect(page.getByText('メーカー別原価合計')).toBeVisible()
        // Check for sort button
        await expect(page.getByRole('button', { name: /ソート切替|昇順|降順/ })).toBeVisible()
    })
})
