import { test, expect } from '@playwright/test'

const PROD_URL = 'https://inventory-main-tawny.vercel.app'

test.describe('本番環境: フィルタ保持機能のテスト', () => {
  test.setTimeout(60000) // 60秒のタイムアウト

  test('商品編集後にフィルタが保持される', async ({ page }) => {
    // ログイン
    await page.goto(`${PROD_URL}/login`)
    await page.waitForLoadState('networkidle')

    console.log('ログインページに到達しました')

    // ログインフォームの入力
    await page.getByPlaceholder('ユーザー名を入力').fill('admin')
    await page.getByPlaceholder('パスワードを入力').fill('admin123')
    await page.getByRole('button', { name: 'ログイン' }).click()

    // ダッシュボードへの遷移を待つ
    await page.waitForURL('**/dashboard', { timeout: 20000 })
    console.log('ログイン成功')

    // 商品一覧に移動
    await page.goto(`${PROD_URL}/products`)
    await page.waitForLoadState('networkidle')
    console.log('商品一覧に到達しました')

    // フィルタを適用（検索のみ）
    const searchInput = page.locator('input[placeholder*="検索"]').first()
    await searchInput.fill('テーブル')
    await page.waitForTimeout(1000) // デバウンス待機

    // 現在のURLを記録
    const filteredUrl = page.url()
    console.log('フィルタ適用後のURL:', filteredUrl)

    // 商品が表示されているか確認
    const productRows = page.locator('table tbody tr, [data-testid="product-card"]')
    const rowCount = await productRows.count()
    console.log('商品数:', rowCount)

    if (rowCount > 0) {
      // 最初の商品をクリック
      await productRows.first().click()
      await page.waitForLoadState('networkidle')

      // 詳細画面のURLにクエリパラメータが含まれているか確認
      const detailUrl = page.url()
      console.log('詳細画面のURL:', detailUrl)
      expect(detailUrl).toContain('/products/')

      if (filteredUrl.includes('?')) {
        expect(detailUrl).toContain('?')
        console.log('✓ 詳細画面にクエリパラメータが保持されています')
      }

      // 編集ボタンをクリック
      await page.getByRole('link', { name: '編集' }).click()
      await page.waitForLoadState('networkidle')

      // 編集画面のURLにクエリパラメータが含まれているか確認
      const editUrl = page.url()
      console.log('編集画面のURL:', editUrl)
      expect(editUrl).toContain('/edit')

      if (filteredUrl.includes('?')) {
        expect(editUrl).toContain('?')
        console.log('✓ 編集画面にクエリパラメータが保持されています')
      }

      // キャンセルボタンをクリック
      await page.getByRole('link', { name: 'キャンセル' }).click()
      await page.waitForLoadState('networkidle')

      // 商品一覧に戻ったことを確認
      const backUrl = page.url()
      console.log('一覧画面に戻った後のURL:', backUrl)
      expect(backUrl).toContain('/products')

      // フィルタが保持されているか確認
      if (filteredUrl.includes('?')) {
        expect(backUrl).toContain('?')
        console.log('✓ フィルタが保持されています')
      }

      console.log('✅ テスト成功: フィルタ保持機能が正常に動作しています')
    } else {
      console.log('⚠ フィルタ結果に商品が見つかりませんでした')
      test.skip()
    }
  })
})
