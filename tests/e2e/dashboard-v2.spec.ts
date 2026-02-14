import { test, expect } from '@playwright/test'
import { getE2eCredentials } from './helpers/auth'

test.describe('Dashboard V2', () => {
    test.beforeEach(async ({ page }) => {
        const { username, password } = getE2eCredentials()
        await page.goto('/login')
        await page.fill('input[name="username"]', username)
        await page.fill('input[name="password"]', password)
        await page.click('button[type="submit"]')
        await page.waitForURL('/dashboard')
    })

    test('should display V2 stats cards', async ({ page }) => {
        // v2.1: 統計カードは2つのみ（品目数・メーカー数は削除）
        // CardTitle内のテキストを特定（first()で最初の統計カードを確認）
        await expect(page.getByText('原価合計', { exact: true }).first()).toBeVisible()
        await expect(page.getByText('商品総数', { exact: true }).first()).toBeVisible()
        // 統計カードの説明文も確認
        await expect(page.getByText('全商品の原価合計')).toBeVisible()
        await expect(page.getByText('登録されている商品')).toBeVisible()
        // v2.1で追加された運用ルールカードも確認
        await expect(page.getByText('運用ルール', { exact: true })).toBeVisible()
    })

    test('should display Cost By Manufacturer component', async ({ page }) => {
        await expect(page.getByText('メーカー別原価合計')).toBeVisible()
        // Check for sort button
        await expect(page.getByRole('button', { name: /ソート切替|昇順|降順/ })).toBeVisible()
    })
})
