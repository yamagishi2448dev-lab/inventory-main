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

        // v2: Popover + Buttonパターンでフィルタを実装
        // メーカーフィルタボタンをクリックしてPopoverを開く
        const manufacturerButton = page.getByRole('button', { name: /メーカー/ })
        await expect(manufacturerButton).toBeVisible()
        await manufacturerButton.click()

        // Popoverが表示されるまで待機
        const popover = page.locator('[role="dialog"]').last()
        await expect(popover).toBeVisible()

        // 最初のメーカーを選択（「すべて」を除く）
        const manufacturerOptions = popover.locator('button').filter({ hasText: /^(?!すべて)/ })
        const firstOption = manufacturerOptions.first()

        // オプションが存在する場合のみクリック
        if (await firstOption.count() > 0) {
            await firstOption.click()

            // URLパラメータが更新されたことを確認
            await page.waitForFunction(() => {
                const params = new URLSearchParams(window.location.search)
                return params.has('manufacturerId')
            }, { timeout: 5000 })

            // リセットボタンが有効になることを確認
            await expect(page.getByRole('button', { name: /リセット/ })).toBeEnabled()
        }
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
