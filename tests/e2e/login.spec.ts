import { test, expect } from '@playwright/test'
import { getE2eCredentials } from './helpers/auth'

test.describe('Login Flow', () => {
  const { username, password } = getE2eCredentials()

  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('should display login form', async ({ page }) => {
    // Check for page title
    await expect(page.locator('text=在庫管理システム')).toBeVisible()
    await expect(page.locator('text=アカウント情報を入力してログインしてください')).toBeVisible()

    // Check for username and password inputs
    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.locator('button:has-text("ログイン")')).toBeVisible()
  })

  test('should login successfully with correct credentials', async ({
    page,
  }) => {
    // Fill in login form
    await page.fill('input#username', username)
    await page.fill('input#password', password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard')

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/dashboard')
    // ダッシュボードの統計カードを確認
    await expect(page.getByText('原価合計').first()).toBeVisible()
  })

  test('should show error message with incorrect credentials', async ({
    page,
  }) => {
    // Fill in login form with wrong password
    await page.fill('input#username', username)
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
  const { username, password } = getE2eCredentials()

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('input#username', username)
    await page.fill('input#password', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should logout successfully', async ({ page }) => {
    // ユーザーメニューを開く
    await page.click('button:has-text("admin")')

    // ログアウトボタンをクリック
    await page.click('text=ログアウト')

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
  const { username, password } = getE2eCredentials()

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input#username', username)
    await page.fill('input#password', password)
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Refresh the page
    await page.reload()

    // Should still be on dashboard
    await expect(page).toHaveURL('/dashboard')
    // ダッシュボードの統計カードを確認
    await expect(page.getByText('原価合計').first()).toBeVisible()
  })
})
