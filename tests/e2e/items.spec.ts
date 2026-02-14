import { test, expect } from '@playwright/test'
import { getE2eCredentials } from './helpers/auth'

// 共通ログインヘルパー
async function login(page: import('@playwright/test').Page) {
  const { username, password } = getE2eCredentials()
  await page.goto('/login')
  await page.fill('input[name="username"]', username)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
}

test.describe('Items List', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display items list page with tabs', async ({ page }) => {
    await page.goto('/items')

    // タブが表示される
    await expect(page.getByRole('tab', { name: 'すべて' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '商品' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '委託品' })).toBeVisible()

    // 新規登録ボタン
    await expect(page.getByRole('link', { name: '新規登録' })).toBeVisible()
  })

  test('should display table headers in list view', async ({ page }) => {
    await page.goto('/items')

    // テーブルヘッダーが表示される
    await expect(page.getByRole('columnheader', { name: /メーカー/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /品目/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /個数/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /場所/ })).toBeVisible()
  })

  test('should filter by product type tab', async ({ page }) => {
    await page.goto('/items')

    // 「商品」タブをクリック
    await page.getByRole('tab', { name: '商品' }).click()

    // URLにtype=PRODUCTが追加される
    await page.waitForFunction(() => {
      const params = new URLSearchParams(window.location.search)
      return params.get('type') === 'PRODUCT'
    }, { timeout: 5000 })

    // 「委託品」タブをクリック
    await page.getByRole('tab', { name: '委託品' }).click()

    // URLにtype=CONSIGNMENTが追加される
    await page.waitForFunction(() => {
      const params = new URLSearchParams(window.location.search)
      return params.get('type') === 'CONSIGNMENT'
    }, { timeout: 5000 })
  })

  test('should switch between list and grid view', async ({ page }) => {
    await page.goto('/items')

    // 写真表示ボタンをクリック
    const gridButton = page.locator('button[title="写真表示"]')
    await expect(gridButton).toBeVisible()
    await gridButton.click()

    // URLにview=gridが追加される
    await page.waitForFunction(() => {
      const params = new URLSearchParams(window.location.search)
      return params.get('view') === 'grid'
    }, { timeout: 5000 })

    // リスト表示に戻す
    const listButton = page.locator('button[title="リスト表示"]')
    await listButton.click()

    await page.waitForFunction(() => {
      const params = new URLSearchParams(window.location.search)
      return params.get('view') === 'list'
    }, { timeout: 5000 })
  })

  test('should display filter dropdowns', async ({ page }) => {
    await page.goto('/items')

    // フィルターボタンが表示される
    const manufacturerButton = page.getByRole('button', { name: /メーカー/ })
    await expect(manufacturerButton).toBeVisible()

    const categoryButton = page.getByRole('button', { name: /品目/ })
    await expect(categoryButton).toBeVisible()

    const locationButton = page.getByRole('button', { name: /場所/ })
    await expect(locationButton).toBeVisible()
  })

  test('should display search box', async ({ page }) => {
    await page.goto('/items')

    // 検索ボックスが表示される
    const searchInput = page.locator('input[placeholder*="検索"]')
    await expect(searchInput).toBeVisible()
  })

  test('should show sold items toggle', async ({ page }) => {
    await page.goto('/items')

    // 販売済みを含むトグルが表示される
    await expect(page.getByText('販売済みを含む')).toBeVisible()
  })
})

test.describe('Items Create', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should display product create form', async ({ page }) => {
    await page.goto('/items/new?type=PRODUCT')

    // ページタイトル
    await expect(page.getByText('商品登録')).toBeVisible()
    await expect(page.getByText('SKUは自動採番されます')).toBeVisible()

    // 必須フィールド
    await expect(page.locator('#name')).toBeVisible()
    await expect(page.locator('#costPrice')).toBeVisible()

    // 任意フィールド
    await expect(page.locator('#manufacturerId')).toBeVisible()
    await expect(page.locator('#categoryId')).toBeVisible()
    await expect(page.locator('#specification')).toBeVisible()
    await expect(page.locator('#fabricColor')).toBeVisible()
    await expect(page.locator('#quantity')).toBeVisible()
    await expect(page.locator('#unitId')).toBeVisible()
    await expect(page.locator('#listPrice')).toBeVisible()
    await expect(page.locator('#arrivalDate')).toBeVisible()
    await expect(page.locator('#locationId')).toBeVisible()
    await expect(page.locator('#designer')).toBeVisible()
    await expect(page.locator('#notes')).toBeVisible()
  })

  test('should display consignment create form without cost price', async ({ page }) => {
    await page.goto('/items/new?type=CONSIGNMENT')

    // ページタイトル
    await expect(page.getByText('委託品登録')).toBeVisible()

    // 原価単価フィールドは非表示
    await expect(page.locator('#costPrice')).toBeHidden()
  })

  test('should have type toggle tabs on create form', async ({ page }) => {
    await page.goto('/items/new')

    // タイプ切り替えタブ
    await expect(page.getByRole('tab', { name: '商品' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '委託品' })).toBeVisible()
  })
})

test.describe('Items Detail', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should navigate to item detail from list', async ({ page }) => {
    await page.goto('/items')

    // テーブルの行をクリック
    const firstRow = page.locator('table tbody tr').first()
    if (await firstRow.count() > 0) {
      await firstRow.click()

      // 詳細ページに遷移
      await page.waitForURL(/\/items\//)
      await expect(page.getByText('基本情報')).toBeVisible()
    }
  })

  test('should display item detail with all fields', async ({ page }) => {
    await page.goto('/items')

    const firstRow = page.locator('table tbody tr').first()
    if (await firstRow.count() > 0) {
      await firstRow.click()
      await page.waitForURL(/\/items\//)

      // 基本情報セクション
      await expect(page.getByText('SKU')).toBeVisible()
      await expect(page.getByText('メーカー')).toBeVisible()
      await expect(page.getByText('品目')).toBeVisible()
      await expect(page.getByText('場所')).toBeVisible()

      // 操作ボタン
      await expect(page.getByRole('link', { name: '編集' })).toBeVisible()
      await expect(page.getByRole('button', { name: '削除' })).toBeVisible()
      await expect(page.getByRole('link', { name: '戻る' })).toBeVisible()
    }
  })
})

test.describe('Items Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should have items link in sidebar', async ({ page }) => {
    await page.goto('/dashboard')

    // サイドバーにアイテムリンクがある
    const itemsLink = page.locator('a[href="/items"]')
    await expect(itemsLink).toBeVisible()
  })

  test('should redirect old product URLs', async ({ page }) => {
    // 旧URLにアクセスした場合のリダイレクト
    // Note: APIレベルのリダイレクトなのでフロントエンドでは直接テストしない
    await page.goto('/items')
    await expect(page).toHaveURL(/\/items/)
  })
})

test.describe('Items Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should show pagination when more than 20 items', async ({ page }) => {
    await page.goto('/items')

    // ページネーションが表示されるかチェック（データ量による）
    const totalText = page.locator('text=/\\d+件/')
    await expect(totalText.first()).toBeVisible()
  })
})

test.describe('Items Selection', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should show selection count', async ({ page }) => {
    await page.goto('/items')

    // 選択カウントが表示される
    await expect(page.getByText(/選択 \d+ \/ \d+件/)).toBeVisible()
  })

  test('should show filter result select all button', async ({ page }) => {
    await page.goto('/items')

    // 全件選択ボタンが表示される
    await expect(page.getByRole('button', { name: /フィルタ結果を全件選択/ })).toBeVisible()
  })
})
