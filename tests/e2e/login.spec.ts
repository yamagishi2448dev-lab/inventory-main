import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    // Check for page title
    await expect(page.locator('text=Inventory')).toBeVisible()
    await expect(page.locator('text=在庫管理システム')).toBeVisible()

    // Check for username and password inputs
    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('button:has-text("ログイン")')).toBeVisible()
  })

  test('should login successfully with correct credentials', async ({
    page,
  }) => {
    // Fill in login form
    await page.fill('input#username', 'admin')
    await page.fill('input#password', 'password123')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard')

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('ダッシュボード')
  })

  test('should show error message with incorrect credentials', async ({
    page,
  }) => {
    // Fill in login form with wrong password
    await page.fill('input#username', 'admin')
    await page.fill('input#password', 'wrongpassword')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for error message
    await expect(page.locator('text=ユーザー名またはパスワードが正しくありません')).toBeVisible()

    // Verify we're still on login page
    await expect(page).toHaveURL('/login')
  })

  test('should show error message with empty fields', async ({ page }) => {
    // Try to submit without filling the form
    await page.click('button[type="submit"]')

    // Browser validation should prevent submission or show error
    // The exact behavior depends on the form implementation
    await expect(page).toHaveURL('/login')
  })

  test('should redirect to login when accessing protected route without auth', async ({
    page,
  }) => {
    // Try to access dashboard without logging in
    await page.goto('/dashboard')

    // Should be redirected to login
    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input#username', 'admin')
    await page.fill('input#password', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should logout successfully', async ({ page }) => {
    // Find and click logout button
    const logoutButton = page.locator('text=ログアウト').first()
    await logoutButton.click()

    // Should be redirected to login page
    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')

    // Try to access dashboard again
    await page.goto('/dashboard')

    // Should be redirected to login again
    await page.waitForURL('/login')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Session Persistence', () => {
  test('should maintain session across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input#username', 'admin')
    await page.fill('input#password', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Refresh the page
    await page.reload()

    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('ダッシュボード')
  })
})
