# テストガイド

このディレクトリには、在庫管理システム「Inventory」のテストが含まれています。

## テストの種類

### 1. ユニットテスト (Unit Tests)

**場所**: `tests/unit/`

**説明**: 個別の関数やモジュールの動作を検証します。

**実行方法**:
```bash
# 全てのユニットテストを実行
npm test

# ウォッチモードで実行（ファイル変更時に自動再実行）
npm run test:watch

# カバレッジレポート付きで実行
npm run test:coverage
```

**テストファイル**:
- `password.test.ts` - パスワードハッシュ化・検証のテスト
- `product-validation.test.ts` - 商品バリデーションスキーマのテスト

### 2. 統合テスト (Integration Tests)

**場所**: `tests/integration/`

**説明**: 複数のコンポーネントやAPIエンドポイントの連携を検証します。

**実行方法**:
```bash
# 統合テストはユニットテストと同じコマンドで実行されます
npm test
```

**注意**: 統合テストはデータベース接続が必要です。テスト実行前に`.env`ファイルが正しく設定されていることを確認してください。

### 3. E2Eテスト (End-to-End Tests)

**場所**: `tests/e2e/`

**説明**: ユーザーの実際の操作フローを再現し、アプリケーション全体の動作を検証します。

**実行方法**:
```bash
# 全てのブラウザでE2Eテストを実行
npm run test:e2e

# UIモードで実行（デバッグに便利）
npm run test:e2e:ui

# テストレポートを表示
npm run test:e2e:report

# 特定のブラウザのみでテスト
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**テストファイル**:
- `login.spec.ts` - ログイン・ログアウトフローのテスト
- `products.spec.ts` - 商品CRUD操作のテスト

**注意**: E2Eテストは開発サーバーが自動的に起動されます（`playwright.config.ts`で設定）。

## テストカバレッジ

カバレッジレポートを生成するには:

```bash
npm run test:coverage
```

カバレッジレポートは以下の場所に生成されます:
- テキスト形式: コンソール出力
- HTML形式: `coverage/index.html`
- JSON形式: `coverage/coverage-final.json`

### カバレッジ目標

- ユーティリティ関数: **80%以上**
- APIエンドポイント: **70%以上**
- 主要ユーザーフロー: **E2Eで100%カバー**

## テストの書き方

### ユニットテストの例

```typescript
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

describe('Password utilities', () => {
  it('should hash password correctly', async () => {
    const password = 'password123'
    const hashed = await hashPassword(password)
    expect(hashed).not.toBe(password)
  })
})
```

### E2Eテストの例

```typescript
import { test, expect } from '@playwright/test'

test('should login successfully', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[type="password"]', 'password123')
  await page.click('button[type="submit"]')
  await page.waitForURL('/dashboard')
  await expect(page).toHaveURL('/dashboard')
})
```

## CI/CDでのテスト実行

GitHub ActionsなどのCI/CD環境でテストを実行する場合:

```yaml
- name: Run unit tests
  run: npm test

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

## トラブルシューティング

### ユニットテストが失敗する

- 依存パッケージが最新か確認: `npm install`
- `.env`ファイルが正しく設定されているか確認

### E2Eテストが失敗する

- ブラウザがインストールされているか確認: `npx playwright install`
- 開発サーバーが起動できるか確認: `npm run dev`
- ポート3000が既に使用されていないか確認: `lsof -ti:3000`

### カバレッジが生成されない

- `@vitest/coverage-v8`がインストールされているか確認: `npm install -D @vitest/coverage-v8`

## 参考リンク

- [Vitest ドキュメント](https://vitest.dev/)
- [Playwright ドキュメント](https://playwright.dev/)
- [Testing Library ドキュメント](https://testing-library.com/)
