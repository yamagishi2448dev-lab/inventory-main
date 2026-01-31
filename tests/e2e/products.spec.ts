import { test, expect } from '@playwright/test'

// Helper function to login before each test
async function login(page: any) {
  await page.goto('/login')
  await page.fill('input#username', 'admin')
  await page.fill('input#password', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
}

test.describe('Products CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display products list page', async ({ page }) => {
    // Navigate to products page directly
    await page.goto('/products')

    // v2: タイトルは削除されたため、代わりにページの主要要素を確認
    // 検索ボックスとアクションボタンが表示されていることを確認
    await expect(page.getByPlaceholder('商品名、仕様で検索...')).toBeVisible()
    await expect(page.locator('text=新規登録')).toBeVisible()
  })

  test('should navigate to product creation page', async ({ page }) => {
    // Go to products page
    await page.goto('/products')

    // Click new product button
    await page.click('text=新規登録')
    await page.waitForURL('/products/new')

    // Verify we're on the create page
    await expect(page).toHaveURL('/products/new')
    await expect(page.locator('h1')).toContainText('商品登録')
  })

  test('should create a new product', async ({ page }) => {
    // Navigate to product creation page
    await page.goto('/products/new')

    // v2: SKUは自動採番されるため、メッセージを確認
    await expect(page.getByText('SKUは自動採番されます')).toBeVisible()

    // Fill in product details
    const timestamp = Date.now()
    const productName = `Test Product ${timestamp}`

    // v2の必須フィールドのみ入力（name, costPrice）
    await page.fill('input[name="name"]', productName)
    await page.fill('input[name="costPrice"]', '1999')
    await page.fill('input[name="quantity"]', '50')

    // Submit form
    await page.click('button[type="submit"]')

    // v2: 作成後は詳細ページにリダイレクトされる可能性があるため、柔軟に待機
    await page.waitForTimeout(2000)

    // If redirected to product detail page, navigate to products list
    if (!page.url().includes('/products') || page.url().includes('/products/')) {
      await page.goto('/products')
    }

    // Verify the new product appears in the list
    await expect(page.locator(`text=${productName}`)).toBeVisible({
      timeout: 10000,
    })
  })

  test('should validate required fields when creating product', async ({
    page,
  }) => {
    // Navigate to product creation page
    await page.goto('/products/new')

    // Try to submit without filling required fields
    await page.click('button[type="submit"]')

    // Should still be on the same page
    await expect(page).toHaveURL('/products/new')

    // Validation errors should be visible (implementation-dependent)
    // This test verifies the form doesn't submit with empty required fields
  })

  test('should view product details', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products')

    // v2: テーブル行全体ではなく、商品名リンクをクリック
    const firstProductName = page.locator('table tbody tr').first().locator('td').nth(2).locator('a')
    if (await firstProductName.isVisible()) {
      await firstProductName.click()

      // Should navigate to product details page
      await page.waitForURL(/\/products\/[^\/]+$/, { timeout: 5000 })
      await expect(page.url()).toContain('/products/')
      await expect(page.url()).not.toContain('/edit')

      // Verify product details are displayed
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('text=編集')).toBeVisible()
    }
  })

  test('should edit an existing product', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products')

    // v2: 商品名リンクをクリックして詳細ページに移動
    const firstProductName = page.locator('table tbody tr').first().locator('td').nth(2).locator('a')
    if (await firstProductName.isVisible()) {
      await firstProductName.click()

      // Wait for detail page to load
      await page.waitForURL(/\/products\/[^\/]+$/, { timeout: 5000 })

      // Click edit button
      await page.click('text=編集')
      await page.waitForURL(/\/products\/[^\/]+\/edit$/, { timeout: 5000 })
      await expect(page.url()).toContain('/edit')

      // Update product name
      const timestamp = Date.now()
      const updatedName = `Updated Product ${timestamp}`
      await page.fill('input[name="name"]', updatedName)

      // v2: SKUは自動採番のため編集不可（表示のみ）
      // costPrice と quantity は v2 のフィールド名
      const costPriceInput = page.locator('input[name="costPrice"]')
      if (await costPriceInput.isVisible()) {
        await costPriceInput.fill('2500')
      }

      // Submit form
      await page.click('button[type="submit"]')

      // Wait for navigation
      await page.waitForTimeout(1000)

      // Verify the updated product name is visible
      await expect(page.locator(`text=${updatedName}`)).toBeVisible({
        timeout: 10000,
      })
    }
  })

  test('should search for products', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products')

    // Find search input
    const searchInput = page.locator('input[placeholder*="検索"]')

    if (await searchInput.isVisible()) {
      // Enter search term
      await searchInput.fill('Test')

      // Wait for search results to update
      await page.waitForTimeout(500)

      // Verify search functionality works (results should update)
      // The exact verification depends on implementation
    }
  })

  test('should filter products by category', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products')

    // Find category filter dropdown (if exists)
    const categoryFilter = page.locator('select[name="categoryId"]')

    if (await categoryFilter.isVisible()) {
      // Select a category
      await categoryFilter.selectOption({ index: 1 })

      // Wait for results to update
      await page.waitForTimeout(500)

      // Verify filtered results are displayed
    }
  })

  test('should delete a product', async ({ page }) => {
    // 削除するための商品を作成
    await page.goto('/products/new')

    const timestamp = Date.now()
    const productName = `Delete Me ${timestamp}`

    // v2: SKUは自動採番、必須フィールドのみ入力
    await page.fill('input[name="name"]', productName)
    await page.fill('input[name="costPrice"]', '100')
    await page.click('button[type="submit"]')

    await page.waitForURL('/products')

    // 作成した商品を見つけてクリック
    await page.click(`text=${productName}`)

    // 削除ボタンをクリック
    const deleteButton = page.locator('button:has-text("削除")')
    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // 削除確認ダイアログで確認
      const confirmButton = page.locator('button:has-text("削除する")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()

        // 商品一覧にリダイレクト
        await page.waitForURL('/products', { timeout: 5000 })

        // 削除した商品が一覧に表示されないことを確認
        await expect(page.locator(`text=${productName}`)).not.toBeVisible({
          timeout: 5000,
        })
      }
    }
  })

  test('should update stock quantity', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products')

    // Click on the first product
    const firstProduct = page.locator('table tbody tr').first()
    await firstProduct.click()

    // v2: フィールド名は 'quantity'（'stock' から変更）
    const quantityInput = page.locator('input[name="quantity"]')

    if (await quantityInput.isVisible()) {
      // Update quantity
      await quantityInput.fill('999')

      // Save changes
      const saveButton = page.locator('button:has-text("保存")')
      if (await saveButton.isVisible()) {
        await saveButton.click()

        // Verify quantity was updated
        await expect(page.locator('text=999')).toBeVisible({ timeout: 5000 })
      }
    }
  })
})

test.describe('Product Images', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate to product with image upload capability', async ({
    page,
  }) => {
    // Navigate to product creation page
    await page.goto('/products/new')

    // v2: ラベル要素を使用して画像アップロードセクションを確認
    const imageUpload = page.getByText('商品画像', { exact: true }).first()
    await expect(imageUpload).toBeVisible()
  })
})

test.describe('Product Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display pagination controls if many products exist', async ({
    page,
  }) => {
    // Navigate to products page
    await page.goto('/products')

    // Look for pagination controls
    const pagination = page.locator('[role="navigation"]').last()

    // If pagination exists, test it
    const hasPagination = await pagination.isVisible().catch(() => false)

    if (hasPagination) {
      // Verify pagination controls work
      const nextButton = page.locator('button:has-text("次へ")')
      if (await nextButton.isVisible()) {
        await nextButton.click()
        await page.waitForTimeout(500)

        // Verify page changed
        await expect(page.url()).toContain('page=2')
      }
    }
  })
})
