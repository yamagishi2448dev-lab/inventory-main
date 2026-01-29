import { test } from '@playwright/test'

const now = () => Date.now()
const okish = (status: number) => status >= 200 && status < 400

const waitForResponses = (page: any, substrings: string[]) => {
  return Promise.all(
    substrings.map((substring) =>
      page.waitForResponse((resp: any) => {
        const url = resp.url()
        return url.includes(substring) && okish(resp.status())
      })
    )
  )
}

const log = (label: string, ms: number) => {
  // Keep output parseable for summary
  console.log(`[perf] ${label}: ${ms}ms`)
}

test('perf: navigation timings (login, dashboard, products)', async ({ page }) => {
  const username = process.env.PERF_USERNAME ?? 'admin'
  const password = process.env.PERF_PASSWORD ?? 'password123'

  await page.goto('/login')
  await page.fill('#username', username)
  await page.fill('#password', password)

  const dashboardApiWait = waitForResponses(page, [
    '/api/dashboard/stats',
    '/api/auth/session',
    '/api/dashboard/cost-by-manufacturer',
    '/api/change-logs',
  ])

  const loginStart = now()
  await Promise.all([
    page.waitForURL('**/dashboard'),
    page.click('button[type="submit"]'),
  ])
  const loginToDashboardUrl = now() - loginStart

  await dashboardApiWait
  const loginToDashboardData = now() - loginStart

  log('login -> dashboard (url)', loginToDashboardUrl)
  log('login -> dashboard (all api)', loginToDashboardData)

  const productsApiWait = waitForResponses(page, [
    '/api/products?',
    '/api/filters',
  ])
  const productsStart = now()
  await page.goto('/products')
  await productsApiWait
  const productsData = now() - productsStart
  log('products list (all api)', productsData)

  const page2Wait = waitForResponses(page, ['/api/products?'])
  const page2Start = now()
  await page.goto('/products?page=2')
  await page2Wait
  const page2Data = now() - page2Start
  log('products page=2 (api)', page2Data)
})
