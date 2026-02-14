import type { Page } from '@playwright/test'

export function getE2eCredentials() {
  return {
    username: process.env.E2E_USERNAME ?? 'admin',
    password: process.env.E2E_PASSWORD ?? 'password123',
  }
}

export function acceptAllDialogs(page: Page) {
  page.on('dialog', async (dialog) => {
    try {
      await dialog.accept()
    } catch {
      // noop
    }
  })
}

export async function login(page: Page) {
  const { username, password } = getE2eCredentials()

  await page.goto('/login')
  await page.fill('input#username', username)
  await page.fill('input#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
}

