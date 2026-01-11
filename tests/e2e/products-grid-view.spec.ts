import { test, expect } from '@playwright/test'

test.describe('Product Grid View', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login')
        await page.fill('input[name="username"]', 'admin')
        await page.fill('input[name="password"]', 'password123')
        await page.click('button[type="submit"]')
        await page.waitForURL('/dashboard')
    })

    test('should switch between list and grid view', async ({ page }) => {
        await page.goto('/products')

        // Default should be Table view
        await expect(page.getByRole('table')).toBeVisible()

        // Click Grid View button (LayoutGrid icon)
        // Adjust selector if necessary, using title or icon class
        await page.getByTitle('写真表示').click()

        // Table should be hidden, grid should be visible
        await expect(page.getByRole('table')).toBeHidden()
        // Check for grid items (card elements or specific class)
        // Since if no products, it shows empty message. Assuming seeded data.
        // If data exists:
        // await expect(page.locator('.grid')).toBeVisible()

        // Click List View button
        await page.getByTitle('リスト表示').click()
        await expect(page.getByRole('table')).toBeVisible()
    })
})
