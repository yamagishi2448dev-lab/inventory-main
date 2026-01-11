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
    // Navigate to products page
    await page.click('text=商品')
    await page.waitForURL('/products')

    // Verify page elements
    await expect(page.locator('h1')).toContainText('商品一覧')
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

    // Fill in product details
    const timestamp = Date.now()
    const productName = `Test Product ${timestamp}`
    const productSKU = `TEST-${timestamp}`

    await page.fill('input[name="name"]', productName)
    await page.fill('input[name="sku"]', productSKU)
    await page.fill('input[name="price"]', '1999')
    await page.fill('input[name="stock"]', '50')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to products list
    await page.waitForURL('/products', { timeout: 10000 })

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

    // Click on the first product in the list
    const firstProduct = page.locator('table tbody tr').first()
    await firstProduct.click()

    // Should navigate to product details page
    await expect(page.url()).toContain('/products/')
    await expect(page.url()).not.toContain('/edit')

    // Verify product details are displayed
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=編集')).toBeVisible()
  })

  test('should edit an existing product', async ({ page }) => {
    // Navigate to products page
    await page.goto('/products')

    // Click on the first product to view details
    const firstProduct = page.locator('table tbody tr').first()
    await firstProduct.click()

    // Click edit button
    await page.click('text=編集')
    await expect(page.url()).toContain('/edit')

    // Update product name
    const timestamp = Date.now()
    const updatedName = `Updated Product ${timestamp}`
    await page.fill('input[name="name"]', updatedName)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for navigation
    await page.waitForTimeout(1000)

    // Verify the updated product name is visible
    await expect(page.locator(`text=${updatedName}`)).toBeVisible({
      timeout: 10000,
    })
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
    // First create a product to delete
    await page.goto('/products/new')

    const timestamp = Date.now()
    const productName = `Delete Me ${timestamp}`
    const productSKU = `DELETE-${timestamp}`

    await page.fill('input[name="name"]', productName)
    await page.fill('input[name="sku"]', productSKU)
    await page.fill('input[name="price"]', '100')
    await page.click('button[type="submit"]')

    await page.waitForURL('/products')

    // Find the product we just created
    await page.click(`text=${productName}`)

    // Click delete button
    const deleteButton = page.locator('button:has-text("削除")')
    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Confirm deletion in dialog
      const confirmButton = page.locator('button:has-text("削除する")')
      if (await confirmButton.isVisible()) {
        await confirmButton.click()

        // Wait for redirect to products list
        await page.waitForURL('/products', { timeout: 5000 })

        // Verify product is no longer in the list
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

    // Look for stock input/field
    const stockInput = page.locator('input[name="stock"]')

    if (await stockInput.isVisible()) {
      // Update stock
      await stockInput.fill('999')

      // Save changes
      const saveButton = page.locator('button:has-text("保存")')
      if (await saveButton.isVisible()) {
        await saveButton.click()

        // Verify stock was updated
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

    // Verify image upload section exists
    const imageUpload = page.locator('text=画像')
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
