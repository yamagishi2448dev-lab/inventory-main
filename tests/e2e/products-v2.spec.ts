import { test, expect } from '@playwright/test'

test.describe('Products V2', () => {
    test.beforeEach(async ({ page }) => {
        // Mock authentication or use stored session if available. 
        // For now, assuming simple login flow or existing session setup in global-setup.
        // If not using global auth, we login here.
        await page.goto('/login')
        await page.fill('input[name="username"]', 'admin')
        await page.fill('input[name="password"]', 'password123')
        await page.click('button[type="submit"]')
        await page.waitForURL('/dashboard')
    })

    test('should display V2 product list columns', async ({ page }) => {
        await page.goto('/products')

        // Check new table headers
        await expect(page.getByRole('columnheader', { name: 'メーカー' })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: '品目' })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: '個数', exact: true })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: '原価単価' })).toBeVisible()
        await expect(page.getByRole('columnheader', { name: '場所' })).toBeVisible()
    })

    test('should allow filtering by manufacturer', async ({ page }) => {
        await page.goto('/products')

        // Wait for filters to load (select options)
        const manufacturerSelect = page.locator('#manufacturer')
        await expect(manufacturerSelect).toBeVisible()

        // Select a manufacturer if available (this depends on seeded data)
        // We just verify the element exists and can be interacted with
        await manufacturerSelect.selectOption({ index: 1 }) // Select first available option

        // Verify URL params
        // Wait a bit for state update if needed, but selectOption usually triggers change
        // Fetch is debounced/triggered.
        // We can check if "フィルタをクリア" button appears
        await expect(page.getByRole('button', { name: 'フィルタをクリア' })).toBeVisible()
    })

    test('should navigate to valid product V2 create page', async ({ page }) => {
        await page.goto('/products/new')

        // Check for new fields
        await expect(page.getByLabel('メーカー')).toBeVisible()
        await expect(page.getByLabel('品目')).toBeVisible()
        await expect(page.getByLabel('仕様')).toBeVisible()
        await expect(page.getByLabel('張地/カラー')).toBeVisible()
        await expect(page.getByLabel('原価単価')).toBeVisible()

        // Check SKU is read-only or hidden/auto-generated message
        await expect(page.getByText('SKUは自動採番されます')).toBeVisible()
    })
})
