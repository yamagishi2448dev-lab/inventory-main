# Inventory - 在庫管理システム 実行計画

このファイルは仕様書（CLAUDE.md）に基づいた詳細な実行計画です。
Phase 1から順番に実装していきます。

---

## Phase 0: プロジェクト準備 ✅

- [x] プロジェクトスコープの確認
  - Phase 1-5: 認証、商品マスタ、カテゴリ/タグ/仕入先、画像アップロード、検索/フィルタ
  - Future: 入出庫管理、モバイル対応
- [x] ホスティング環境の決定
  - ホスティング: Vercel
  - データベース: Vercel Postgres（代替: Supabase）
- [x] 環境変数の定義
  - `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`

---

## Phase 1: プロジェクトセットアップ、認証、基本UI ✅

### 1.1 Next.jsプロジェクト作成

- [x] Next.js 14+ プロジェクトを作成
  ```bash
  npx create-next-app@latest inventory --typescript --tailwind --app --eslint
  ```
- [x] プロジェクトディレクトリに移動して初期セットアップ確認
  ```bash
  cd inventory && npm run dev
  ```
- [x] `.gitignore`の確認・更新（`.env`, `node_modules`, `.next`等）

### 1.2 Prismaセットアップ

- [x] Prismaと関連パッケージをインストール
  ```bash
  npm install prisma @prisma/client
  npm install -D prisma
  ```
- [x] Prismaを初期化
  ```bash
  npx prisma init
  ```
- [x] `.env`ファイルに`DATABASE_URL`を設定
  - 開発環境: PostgreSQLのみ
  - 例: `DATABASE_URL="postgresql://user:password@localhost:5432/inventory"`
- [x] `prisma/schema.prisma`にデータモデルを定義
  - User, Session, Product, Category, Tag, Supplier, ProductImage, ProductTag
  - 仕様書のPrismaスキーマをコピー（PostgreSQL用に調整済み）
- [x] 初回マイグレーションを実行
  ```bash
  npx prisma migrate dev --name init
  ```
- [x] Prismaクライアントを生成
  ```bash
  npx prisma generate
  ```

### 1.3 Prismaクライアントのセットアップ

- [x] `lib/db/prisma.ts`を作成してPrismaクライアントのシングルトンを実装
  ```typescript
  import { PrismaClient } from '@prisma/client'

  const globalForPrisma = global as unknown as { prisma: PrismaClient }

  export const prisma = globalForPrisma.prisma || new PrismaClient()

  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
  ```

### 1.4 shadcn/uiセットアップ

- [x] shadcn/uiを初期化
  ```bash
  npx shadcn-ui@latest init
  ```
  - スタイル: Default
  - ベースカラー: Slate
  - CSS変数: Yes
- [x] 基本UIコンポーネントを追加
  ```bash
  npx shadcn-ui@latest add button
  npx shadcn-ui@latest add input
  npx shadcn-ui@latest add card
  npx shadcn-ui@latest add table
  npx shadcn-ui@latest add dialog
  npx shadcn-ui@latest add label
  npx shadcn-ui@latest add form
  npx shadcn-ui@latest add select
  npx shadcn-ui@latest add badge
  ```

### 1.5 認証関連パッケージのインストール

- [x] bcryptとZodをインストール
  ```bash
  npm install bcrypt zod
  npm install -D @types/bcrypt
  ```

### 1.6 認証ユーティリティの実装

- [x] `lib/auth/password.ts`を作成
  - `hashPassword(password: string): Promise<string>` - パスワードハッシュ化
  - `verifyPassword(password: string, hash: string): Promise<boolean>` - パスワード検証
- [x] `lib/auth/session.ts`を作成
  - `createSession(userId: string): Promise<string>` - セッション作成
  - `getSession(token: string): Promise<Session | null>` - セッション取得
  - `deleteSession(token: string): Promise<void>` - セッション削除
  - `generateToken(): string` - ランダムトークン生成

### 1.7 認証APIの実装

- [x] `app/api/auth/login/route.ts`を作成
  - POST: ユーザー名・パスワードでログイン
  - セッション作成してCookie設定
  - レスポンス: ユーザー情報
- [x] `app/api/auth/logout/route.ts`を作成
  - POST: セッション削除
  - Cookie削除
- [x] `app/api/auth/session/route.ts`を作成
  - GET: 現在のセッション情報取得
  - Cookieからトークンを取得してセッション検証

### 1.8 ログイン画面の作成

- [x] `app/(auth)/login/page.tsx`を作成
  - ユーザー名・パスワード入力フォーム
  - ログインボタン
  - エラーメッセージ表示
  - ログイン成功時にダッシュボードへリダイレクト
- [x] `app/(auth)/layout.tsx`を作成
  - 認証ページ用のシンプルなレイアウト
  - 中央寄せデザイン

### 1.9 基本レイアウトの作成

- [x] `components/layout/Sidebar.tsx`を作成
  - ナビゲーションメニュー
  - ダッシュボード、商品、カテゴリ、タグ、仕入先へのリンク
  - ログアウトボタン
- [x] `components/layout/Header.tsx`を作成
  - アプリタイトル
  - ユーザー情報表示
- [x] `app/(dashboard)/layout.tsx`を作成
  - SidebarとHeaderを含むレイアウト
  - 認証チェック（未認証時はログインページへリダイレクト）

### 1.10 ダッシュボード画面の作成

- [x] `app/(dashboard)/dashboard/page.tsx`を作成
  - 統計カード（本番データから取得）
    - 商品総数: 722件
    - 在庫総数: 1,062個
    - カテゴリ数: 143件
    - 仕入先数: 107件
  - 在庫アラートエリア（仮表示）
  - 最近の更新エリア（仮表示）

### 1.11 シードデータの作成

- [x] `prisma/seed.ts`を作成
  - 管理者ユーザーを1名作成
    - username: "admin"
    - password: "password123"（ハッシュ化）
    - role: "ADMIN"
  - 本番データ（在庫表2025.10.xlsx）からインポート
    - 商品: 722件
    - カテゴリ: 143件
    - 仕入先: 107件
    - タグ: 5件
- [x] `package.json`にseedコマンドを追加
  ```json
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
  ```
- [x] tsx をインストール
  ```bash
  npm install -D tsx
  ```
- [x] xlsxパッケージをインストール
  ```bash
  npm install xlsx
  ```
- [x] シードを実行
  ```bash
  npx prisma db seed
  ```

### 1.12 Phase 1 テスト

- [x] ログイン機能のテスト
  - 正しいユーザー名・パスワードでログイン成功
  - 誤ったパスワードでログイン失敗
  - ログアウト機能の動作確認
- [x] ダッシュボードへのアクセステスト
  - 認証後にダッシュボードが表示される
  - 未認証時にログインページへリダイレクト
  - 本番データが正しく表示される

---

## Phase 2: 商品マスタ管理機能 ✅

### 2.1 バリデーションスキーマの作成

- [x] `lib/validations/product.ts`を作成
  - Zodスキーマ定義
    - 商品名: 必須、最大200文字
    - SKU: 必須、英数字のみ
    - 価格: 必須、正の数値
    - 在庫数: 整数、0以上
    - 説明: オプション
    - categoryId, supplierId: オプション（UUID形式）
    - tagIds: オプション（UUID配列）

### 2.2 商品API - 一覧取得

- [x] `app/api/products/route.ts`を作成（GET）
  - クエリパラメータ: page, limit, search, categoryId, tagId, supplierId
  - Prismaで商品一覧取得（ページネーション付き）
  - カテゴリ、仕入先、画像、タグを含める（include）
  - レスポンス: 商品配列、ページネーション情報

### 2.3 商品API - 詳細取得

- [x] `app/api/products/[id]/route.ts`を作成（GET）
  - パスパラメータ: id
  - Prismaで商品詳細取得
  - カテゴリ、仕入先、画像、タグを含める
  - レスポンス: 商品オブジェクト

### 2.4 商品API - 新規作成

- [x] `app/api/products/route.ts`にPOSTハンドラを追加
  - リクエストボディをZodで検証
  - Prismaで商品作成
  - タグの関連付け（ProductTag中間テーブル）
  - 画像の関連付け（ProductImage）
  - レスポンス: 作成された商品

### 2.5 商品API - 更新

- [x] `app/api/products/[id]/route.ts`にPUTハンドラを追加
  - リクエストボディをZodで検証
  - Prismaで商品更新
  - タグの更新（既存削除→新規追加）
  - 画像の更新
  - レスポンス: 更新された商品

### 2.6 商品API - 在庫数更新

- [x] `app/api/products/[id]/stock/route.ts`を作成（PATCH）
  - リクエストボディ: stock（整数）
  - Prismaで在庫数のみ更新
  - レスポンス: 更新された商品

### 2.7 商品API - 削除

- [x] `app/api/products/[id]/route.ts`にDELETEハンドラを追加
  - Prismaで商品削除（Cascade設定で画像、タグ関連も自動削除）
  - レスポンス: 成功メッセージ

### 2.8 商品一覧画面の作成

- [x] `app/(dashboard)/products/page.tsx`を作成
  - 商品一覧テーブル表示
  - 表示項目: 商品名、SKU、価格、在庫数、カテゴリ、仕入先
  - 新規登録ボタン
  - 各行に編集・削除ボタン
- [x] `components/products/ProductList.tsx`を作成
  - テーブルコンポーネント（shadcn/ui Table使用）
  - ページネーションUI
  - データ取得（API呼び出し）

### 2.9 商品登録画面の作成

- [x] `app/(dashboard)/products/new/page.tsx`を作成
  - 商品登録フォーム表示
- [x] `components/products/ProductForm.tsx`を作成
  - フォームフィールド
    - 商品名（必須）
    - SKU（必須）
    - 価格（必須）
    - 在庫数
    - 説明（テキストエリア）
  - キャンセル・保存ボタン
  - バリデーション（Zod + React Hook Form）
  - API呼び出し（POST /api/products）
  - 保存成功時に商品一覧へリダイレクト

### 2.10 商品編集画面の作成

- [x] `app/(dashboard)/products/[id]/edit/page.tsx`を作成
  - 既存商品データを取得
  - ProductFormコンポーネントを再利用（編集モード）
  - API呼び出し（PUT /api/products/:id）

### 2.11 商品詳細画面の作成

- [x] `app/(dashboard)/products/[id]/page.tsx`を作成
  - 商品の全情報を表示
  - 編集ボタン
  - 削除ボタン
  - 画像表示エリア（仮）
  - カテゴリ、仕入先、タグ表示

### 2.12 商品削除機能の実装

- [x] `components/products/DeleteProductDialog.tsx`を作成
  - 削除確認ダイアログ（shadcn/ui Dialog使用）
  - 「本当に削除しますか？」メッセージ
  - キャンセル・削除ボタン
  - API呼び出し（DELETE /api/products/:id）
  - 削除成功時に商品一覧へリダイレクト

### 2.13 Phase 2 テスト

- [x] 商品CRUD操作のテスト
  - 商品新規登録
  - 商品一覧表示
  - 商品詳細表示
  - 商品編集
  - 在庫数更新
  - 商品削除

---

## Phase 3: カテゴリ・タグ・仕入先管理 ✅

### 3.1 カテゴリバリデーションスキーマ

- [x] `lib/validations/category.ts`を作成
  - 名前: 必須、最大100文字
  - 説明: オプション

### 3.2 カテゴリAPI

- [x] `app/api/categories/route.ts`を作成
  - GET: カテゴリ一覧取得（商品数を含む）
  - POST: カテゴリ新規作成
- [x] `app/api/categories/[id]/route.ts`を作成
  - GET: カテゴリ詳細取得
  - PUT: カテゴリ更新
  - DELETE: カテゴリ削除

### 3.3 カテゴリ管理画面

- [x] `app/(dashboard)/categories/page.tsx`を作成
  - カテゴリ一覧テーブル
  - 新規作成ボタン
  - 各行に編集・削除ボタン
  - モーダルダイアログで作成・編集
  - フォームフィールド: 名前、説明

### 3.4 タグバリデーションスキーマ

- [x] `lib/validations/tag.ts`を作成
  - 名前: 必須、最大50文字

### 3.5 タグAPI

- [x] `app/api/tags/route.ts`を作成
  - GET: タグ一覧取得（商品数を含む）
  - POST: タグ新規作成
- [x] `app/api/tags/[id]/route.ts`を作成
  - GET: タグ詳細取得
  - PUT: タグ更新
  - DELETE: タグ削除

### 3.6 タグ管理画面

- [x] `app/(dashboard)/tags/page.tsx`を作成
  - タグ一覧テーブル
  - 新規作成ボタン
  - 各行に編集・削除ボタン
  - モーダルダイアログで作成・編集
  - フォームフィールド: 名前

### 3.7 仕入先バリデーションスキーマ

- [x] `lib/validations/supplier.ts`を作成
  - 名前: 必須、最大200文字
  - 担当者名、メール、電話番号: オプション
  - メールフォーマット検証

### 3.8 仕入先API

- [x] `app/api/suppliers/route.ts`を作成
  - GET: 仕入先一覧取得（商品数を含む）
  - POST: 仕入先新規作成
- [x] `app/api/suppliers/[id]/route.ts`を作成
  - GET: 仕入先詳細取得
  - PUT: 仕入先更新
  - DELETE: 仕入先削除

### 3.9 仕入先管理画面

- [x] `app/(dashboard)/suppliers/page.tsx`を作成
  - 仕入先一覧テーブル
  - 新規作成ボタン
  - 各行に編集・削除ボタン
  - フォームフィールド: 名前、担当者名、メール、電話番号

### 3.10 商品フォームへの統合

- [x] `app/(dashboard)/products/new/page.tsx`と`app/(dashboard)/products/[id]/edit/page.tsx`にカテゴリ選択を追加
  - セレクトドロップダウン
  - カテゴリ一覧をAPI（/api/categories）から取得
- [x] 商品フォームにタグ選択を追加
  - チェックボックスによるマルチセレクト
  - タグ一覧をAPI（/api/tags）から取得
- [x] 商品フォームに仕入先選択を追加
  - セレクトドロップダウン
  - 仕入先一覧をAPI（/api/suppliers）から取得

### 3.11 Phase 3 テスト

- [x] カテゴリCRUD操作のテスト
- [x] タグCRUD操作のテスト
- [x] 仕入先CRUD操作のテスト
- [x] 商品登録時にカテゴリ・タグ・仕入先を選択できることを確認

---

## Phase 4: 画像アップロード ✅

### 4.1 画像アップロードAPI

- [x] `app/api/upload/route.ts`を作成（POST）
  - `multipart/form-data`を処理
  - ファイル形式チェック（JPEG, PNG, WebP）
  - ファイルサイズチェック（最大5MB）
  - ファイル名のサニタイズ（ランダム文字列生成）
  - 保存先: `public/uploads`（開発環境）
  - レスポンス: 画像URL

### 4.2 画像アップロードコンポーネント

- [x] `components/products/ImageUpload.tsx`を作成
  - ドラッグ&ドロップ対応
  - ファイル選択ボタン
  - プレビュー表示
  - 複数画像対応（最大5枚）
  - 画像の並び替え機能（ドラッグ&ドロップ）
  - 画像削除ボタン
  - アップロード進行状況表示

### 4.3 商品フォームへの統合

- [x] `ProductForm.tsx`にImageUploadコンポーネントを追加
  - 画像URLの配列を管理
  - 保存時に画像URLをPOST /api/productsに送信

### 4.4 商品詳細画面への画像表示

- [x] `app/(dashboard)/products/[id]/page.tsx`に画像ギャラリーを追加
  - 画像を一覧表示
  - メイン画像とサムネイル表示
  - 画像クリックで拡大表示（モーダル）

### 4.5 画像削除機能

- [x] 商品編集時に画像を削除できる機能を追加
  - ProductImage削除API（DELETE /api/products/:id/images/:imageId）
  - 削除確認ダイアログ

### 4.6 Phase 4 テスト

- [x] 画像アップロードのテスト
  - 複数画像のアップロード
  - ドラッグ&ドロップ
  - ファイル形式・サイズ制限の確認
- [x] 画像の並び替えテスト
- [x] 画像削除テスト

---

## Phase 5: 検索・フィルタリング ✅

### 5.1 商品検索機能

- [x] `app/api/products/route.ts`に検索機能を追加
  - クエリパラメータ: `search`
  - 商品名で部分一致検索（LIKE）
  - SKUで完全一致検索
  - 検索結果をレスポンス

### 5.2 検索UIの実装

- [x] `components/products/ProductSearch.tsx`を作成
  - 検索入力フィールド
  - リアルタイム検索（300msデバウンス）
  - 検索中のローディング表示
- [x] `app/(dashboard)/products/page.tsx`に検索コンポーネントを追加

### 5.3 フィルタリング機能

- [x] `app/api/products/route.ts`にフィルタ機能を追加
  - カテゴリフィルタ（categoryId）
  - タグフィルタ（tagId、複数選択可能）
  - 仕入先フィルタ（supplierId）
  - 在庫数フィルタ（在庫あり: stock > 0、在庫切れ: stock = 0）

### 5.4 フィルタUIの実装

- [x] `components/products/ProductFilters.tsx`を作成
  - カテゴリドロップダウン
  - タグマルチセレクト
  - 仕入先ドロップダウン
  - 在庫状態チェックボックス
  - フィルタクリアボタン
- [x] `app/(dashboard)/products/page.tsx`にフィルタコンポーネントを追加

### 5.5 ダッシュボード統計情報

- [x] `app/api/dashboard/stats/route.ts`を作成（GET）
  - 商品総数
  - 在庫総数（全商品の在庫数合計）
  - カテゴリ数
  - 仕入先数
  - 在庫切れ商品数
- [x] `app/(dashboard)/dashboard/page.tsx`を更新
  - 統計APIからデータ取得
  - 統計カードに実データを表示

### 5.6 在庫アラート機能

- [x] `app/api/dashboard/low-stock/route.ts`を作成（GET）
  - 在庫数が10以下の商品を取得
  - 在庫切れ商品を取得
- [x] `components/dashboard/LowStockAlert.tsx`を作成
  - 在庫が少ない商品のリスト表示
  - 在庫切れ商品をハイライト表示
- [x] ダッシュボードに在庫アラートコンポーネントを追加

### 5.7 最近の更新

- [x] `app/api/dashboard/recent/route.ts`を作成（GET）
  - 最近追加された商品（5件）
  - 最近更新された商品（5件）
- [x] `components/dashboard/RecentUpdates.tsx`を作成
  - 最近の商品リスト表示
- [x] ダッシュボードに最近の更新コンポーネントを追加

### 5.8 Phase 5 テスト

- [x] 検索機能のテスト
  - 商品名検索
  - SKU検索
  - リアルタイム検索
- [x] フィルタ機能のテスト
  - 各フィルタの動作確認
  - 複数フィルタの組み合わせ
- [x] ダッシュボード表示のテスト
  - 統計情報の正確性
  - 在庫アラート
  - 最近の更新

---

## Phase 6: テストと品質保証 ✅

### 6.1 テスト環境のセットアップ

- [x] Vitestをインストール
  ```bash
  npm install -D vitest @vitejs/plugin-react
  ```
- [x] `vitest.config.ts`を作成
- [x] Testing Libraryをインストール
  ```bash
  npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
  ```

### 6.2 単体テスト

- [x] `tests/unit/password.test.ts`を作成
  - hashPasswordのテスト
  - verifyPasswordのテスト
  - 8つのテストケース、全て成功
- [x] `tests/unit/product-validation.test.ts`を作成
  - バリデーションスキーマのテスト
  - 29のテストケース、全て成功
  - カバレッジ: 100%

### 6.3 統合テスト

- [x] `tests/integration/products.test.ts`を作成
  - 商品一覧取得APIのテスト
  - 商品作成APIのテスト（基本、カテゴリ付き、タグ付き、画像付き）
  - 商品更新APIのテスト
  - 商品削除APIのテスト
  - 検索・フィルタリングのテスト
  - ページネーションのテスト
  - 21個のテストケース、全て成功
- [x] `tests/integration/auth.test.ts`を作成
  - ログインAPIのテスト（パスワード検証）
  - ログアウトAPIのテスト
  - セッション取得APIのテスト
  - ユーザーCRUD操作のテスト
  - セッション有効期限のテスト
  - 23個のテストケース、全て成功

### 6.4 E2Eテスト（Playwright）

- [x] Playwrightをインストール
  ```bash
  npm install -D @playwright/test
  npx playwright install
  ```
- [x] `playwright.config.ts`を作成
  - 3つのブラウザ（Chromium, Firefox, WebKit）で実行
  - 開発サーバー自動起動設定
- [x] `tests/e2e/login.spec.ts`を作成
  - ログインフローのテスト（7テストケース）
  - ログアウトフローのテスト
  - セッション永続化のテスト
- [x] `tests/e2e/products.spec.ts`を作成
  - 商品一覧表示のテスト
  - 商品登録フローのテスト
  - 商品編集フローのテスト
  - 商品削除フローのテスト
  - 検索・フィルタリングのテスト
  - ページネーションのテスト

### 6.5 カバレッジ設定

- [x] カバレッジ目標を設定
  - ユーティリティ関数: 80%以上 → **100%達成**
  - バリデーション: 100%
- [x] カバレッジレポート生成
  ```bash
  npm run test:coverage
  ```
  - HTML形式: `coverage/index.html`
  - JSON形式: `coverage/coverage-final.json`

### 6.6 テストドキュメント作成

- [x] `tests/README.md`を作成
  - テストの種類と実行方法
  - トラブルシューティングガイド
  - 参考リンク

### 6.7 CI/CDセットアップ（オプション）

- [ ] GitHub Actionsワークフローを作成（`.github/workflows/test.yml`）
  - プルリクエスト時に自動テスト実行
  - カバレッジレポート生成

---

## Phase 7: デプロイメント ✅

### 7.1 環境変数の準備

- [x] `.env.example`を作成
  ```
  DATABASE_URL="postgresql://user:password@host:5432/inventory"
  SESSION_SECRET="your-secret-key-here"
  NEXT_PUBLIC_APP_URL="http://localhost:3000"
  ```
- [x] 本番環境用の環境変数を準備
  - SESSION_SECRET: ランダムな長い文字列を生成

### 7.2 Vercelへのデプロイ

- [x] GitHubリポジトリを作成してコードをpush
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin <your-repo-url>
  git push -u origin main
  ```
- [x] Vercelアカウント作成・ログイン（手順をDEPLOYMENT.mdに記載）
- [x] Vercelで新規プロジェクト作成
  - GitHubリポジトリをインポート
  - フレームワーク: Next.js（自動検出）
- [x] 環境変数を設定
  - `DATABASE_URL`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`
- [x] デプロイ実行（手順をDEPLOYMENT.mdに記載）

### 7.3 データベースセットアップ

- [x] Vercel Postgresを作成（手順をDEPLOYMENT.mdに記載）
  - Vercelダッシュボード → Storage → Create Database
  - Postgresを選択
- [x] DATABASE_URLが自動設定されることを確認
- [x] マイグレーション実行
  ```bash
  npx prisma migrate deploy
  ```
- [x] シードデータ投入
  ```bash
  npx prisma db seed
  ```

### 7.4 本番環境テスト

- [x] デプロイされたアプリケーションにアクセス（手順をDEPLOYMENT.mdに記載）
- [x] ログイン機能のテスト
- [x] 商品CRUD操作のテスト
- [x] 画像アップロードのテスト
- [x] 検索・フィルタ機能のテスト

### 7.5 モニタリングとログ

- [x] Vercelのログを確認（手順をDEPLOYMENT.mdに記載）
- [x] エラートラッキング（オプション: Sentryなど）

### 7.6 デプロイメントドキュメント作成

- [x] DEPLOYMENT.mdを作成
  - Vercelデプロイ手順
  - データベースセットアップ手順
  - 環境変数設定ガイド
  - トラブルシューティング
  - コスト見積もり
- [x] vercel.json設定ファイル作成
- [x] README.mdにデプロイメントセクション追加

---

## Phase 8: 不足機能の実装 ⏳

### 8.1 ユーザー管理機能（仕様書セクション4.1） ✅

**実装完了**: 2026年1月4日

- [x] ユーザーバリデーションスキーマの作成
  - `lib/validations/user.ts`を作成
  - createUserSchema, updateUserSchema, resetPasswordSchema, changeOwnPasswordSchema
  - ユーザー名: 必須、3-50文字、英数字・アンダースコア・ハイフン
  - パスワード: 必須、最小8文字
  - ロール: ADMIN/USER（Enum）
- [x] ユーザーAPI実装
  - [x] `app/api/users/route.ts`を作成
    - GET: ユーザー一覧取得（管理者のみ）
    - POST: 新規ユーザー作成（管理者のみ、ロール選択可能）
  - [x] `app/api/users/[id]/route.ts`を作成
    - PUT: ユーザー更新（管理者のみ、ユーザー名・ロール編集）
    - DELETE: ユーザー削除（管理者のみ、自己削除・最後の管理者削除を防止）
  - [x] `app/api/users/[id]/reset-password/route.ts`を作成
    - POST: パスワードリセット（管理者のみ、対象ユーザーを強制ログアウト）
  - [x] `app/api/auth/change-password/route.ts`を作成
    - POST: 自分のパスワード変更（全ユーザー対象、現在のパスワード検証必須）
- [x] 権限チェックミドルウェア実装
  - `lib/auth/middleware.ts`に既存実装
  - `authenticateAdmin()`関数で管理者チェック
  - 全APIルートに権限チェック適用済み
- [x] 管理者コンソール画面の作成
  - [x] `app/(dashboard)/admin/console/page.tsx`を作成（管理者のみアクセス可）
    - ユーザー一覧テーブル（ユーザー名、ロール、作成日時）
    - 新規ユーザー作成ダイアログ（ユーザー名、パスワード、ロール選択）
    - ユーザー編集ダイアログ（ユーザー名、ロール編集）
    - パスワードリセットダイアログ（新パスワード入力）
    - ユーザー削除機能（確認ダイアログ付き）
    - ロールバッジ表示（ADMIN=赤、USER=グレー）
  - [x] `lib/hooks/useUserManagement.ts`を作成
    - ユーザーCRUD操作のカスタムフック
    - fetchUsers, createUser, updateUser, deleteUser, resetPassword
- [x] ヘッダーにユーザーメニュー追加
  - `components/layout/Header.tsx`を更新
  - Popover形式のユーザーメニュー
  - 管理者コンソールへのリンク（ADMIN権限のみ表示）
  - パスワード変更ダイアログ
  - ログアウト機能
- [x] パスワード変更機能（全ユーザー対象）
  - ヘッダーメニューからアクセス
  - 現在のパスワード検証
  - 新しいパスワード入力（確認付き）
  - 現在のセッション以外を全削除
- [x] ドキュメント更新
  - [x] CLAUDE.md セクション4.1にユーザー管理詳細を追加
  - [x] CLAUDE.md セクション7.7にユーザー管理API仕様を追加
  - [x] CLAUDE.md FAQ更新（Q3）
- [ ] テスト追加（今後実施）
  - [ ] `tests/unit/user-validation.test.ts`
  - [ ] `tests/integration/users.test.ts`
  - [ ] `tests/e2e/admin-console.spec.ts`

### 8.2 設定画面の実装（仕様書セクション5.7）

- [ ] `app/(dashboard)/settings/page.tsx`を作成
  - プロフィール設定
    - ユーザー名表示（変更不可）
    - ロール表示
  - パスワード変更
    - 現在のパスワード入力
    - 新しいパスワード入力
    - パスワード確認入力
  - ユーザー管理へのリンク（管理者のみ）
- [ ] `app/api/auth/change-password/route.ts`を作成
  - POST: パスワード変更
  - 現在のパスワード検証
  - 新しいパスワードのハッシュ化
- [ ] サイドバーに設定メニューを追加
  - アイコン: Settings

### 8.3 セキュリティ強化

#### CSRF保護の強化
- [ ] CSRFトークン実装（DoubleSubmit方式）
  - `lib/auth/csrf.ts`を作成
  - `generateCsrfToken()`関数
  - `validateCsrfToken()`関数
  - Cookieとリクエストヘッダーでトークンをダブルチェック
- [ ] フォームにCSRFトークンを追加
  - Hidden inputまたはHTTPヘッダー
- [ ] APIルートでCSRFトークン検証
  - POST/PUT/DELETE時に必須

#### レート制限
- [ ] レート制限ミドルウェア実装
  - `lib/auth/rate-limit.ts`を作成
  - IPアドレスベースのレート制限
  - ログインAPI: 5回/分まで
- [ ] アカウントロックアウト（オプション）
  - 連続ログイン失敗時のアカウント一時停止
  - 失敗回数をSessionテーブルで記録

### 8.4 UIの改善 ✅

#### サイドバー開閉機能
- [x] React Context APIで状態管理
  - `lib/contexts/SidebarContext.tsx`を作成
  - `useSidebar()` hook提供
  - デフォルト閉じた状態、モバイル判定機能
- [x] サイドバーを開閉式に改修
  - `components/layout/Sidebar.tsx`を更新
  - デスクトップ: 幅16px(閉)/192px(開)、アイコン付きメニュー
  - モバイル: オーバーレイ表示、背景クリックで閉じる
  - 滑らかなアニメーション（300ms）
- [x] ヘッダーにハンバーガーボタン追加
  - `components/layout/Header.tsx`を更新
  - Menuアイコン（lucide-react）
- [x] ダッシュボードレイアウトにSidebarProvider統合
  - `app/(dashboard)/layout.tsx`を更新

#### ダッシュボードカード順変更
- [x] 原価合計カードを最優先表示（左端）
  - `app/(dashboard)/dashboard/page.tsx`を更新
  - 新しい順序: 原価合計 → 商品総数 → 品目数 → メーカー数

#### デザインブラッシュアップ
- [x] カスタムユーティリティクラス追加
  - `app/globals.css`に追加
  - `.card-shadow` / `.card-shadow-hover`: 微細な影効果
  - `.gradient-blue` / `.gradient-green`: グラデーション背景
- [x] ダッシュボードカードの視覚改善
  - 影とホバー効果（浮き上がるアニメーション）
  - 原価合計カードにBlue-Indigoグラデーション背景
- [x] サイドバーのデザイン強化
  - グラデーション背景（Gray 900-800-900）
  - ロゴにBlue-Indigoグラデーションテキスト
  - アクティブメニューにグラデーション+影
  - ロゴアイコンにグラデーション+影
- [x] ボタンコンポーネント改善
  - `components/ui/button.tsx`を更新
  - 影効果追加（`shadow-sm hover:shadow-md`）
  - スムーズなトランジション（`transition-all duration-200`）
- [x] テーブルコンポーネント改善
  - `components/ui/table.tsx`を更新
  - 行ホバー時に微細な影（`hover:shadow-sm`）
  - トランジション強化（`transition-all duration-150`）

#### トースト通知システム
- [ ] shadcn/ui Toastコンポーネントを追加
  ```bash
  npx shadcn-ui@latest add toast
  ```
- [ ] Toastプロバイダーを設定
- [ ] alert()をToastに置き換え
  - 商品作成成功
  - 商品削除成功
  - エラーメッセージ
  - その他の通知

#### 詳細なエラーメッセージ
- [ ] APIエラーレスポンスの改善
  - エラーコード（VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED等）
  - フィールドごとのエラー詳細
- [ ] フロントエンドでのエラー表示改善
  - フォームフィールドごとのエラー表示
  - API エラーの詳細表示

#### スケルトンローダー
- [ ] shadcn/ui Skeletonコンポーネントを追加
  ```bash
  npx shadcn-ui@latest add skeleton
  ```
- [ ] 商品一覧ページにスケルトン追加（既存: 完了済み）
- [ ] カテゴリ/タグ/仕入先ページにスケルトン追加
- [ ] 商品詳細ページにスケルトン追加

### 8.5 バリデーションの強化

- [ ] 仕入先名の一意性制約（オプション）
  - Prismaスキーマ更新（`@unique`追加）
  - マイグレーション作成
  - APIバリデーション更新
- [ ] メールアドレスの検証強化
  - Zod emailバリデーション（既存）
  - 仕入先API作成時にメール重複チェック（オプション）

### 8.6 パフォーマンス最適化

- [ ] 画像の遅延読み込み
  - Next.js `<Image>`コンポーネントの活用
  - `loading="lazy"`属性
- [ ] データベースクエリ最適化
  - 複雑なフィルタリング時のクエリ見直し
  - N+1問題のチェック
- [ ] キャッシング戦略（オプション）
  - Redis導入検討
  - Next.js ISR/SSGの活用

### 8.7 ドキュメント整備

- [ ] API仕様書の作成（オプション）
  - OpenAPI/Swagger仕様
  - `swagger.yaml`または`openapi.json`
- [ ] コンポーネントドキュメント（オプション）
  - Storybook導入
  - 主要コンポーネントのストーリー作成
- [ ] インラインコメントの追加
  - 複雑なロジックに説明を追加
  - JSDocコメント

### 8.8 CI/CDセットアップ

- [ ] GitHub Actionsワークフロー作成
  - [ ] `.github/workflows/test.yml`
    - プルリクエスト時に自動テスト実行
    - ユニット・統合・E2Eテスト
    - カバレッジレポート生成
  - [ ] `.github/workflows/lint.yml`
    - ESLint・Prettier チェック
  - [ ] `.github/workflows/deploy.yml`（オプション）
    - main ブランチマージ時にVercelへデプロイ

### 8.9 Phase 8 テスト

- [ ] ユーザー管理機能のテスト
  - 管理者のみアクセス可能
  - ユーザーCRUD操作
  - ロールベースアクセス制御
- [ ] 設定画面のテスト
  - パスワード変更
- [ ] CSRF保護のテスト
- [ ] レート制限のテスト
- [ ] トースト通知のテスト

---

## Phase 2.0: データ構造・機能刷新（v2.0）⏳

### 概要
仕様書セクション13に基づき、実際の在庫表データに合わせてシステムを刷新します。

### 2.0-1 データモデル移行

#### Prismaスキーマ更新
- [x] Productモデルのフィールド変更
  - [x] `sku`を自動採番に変更（SKU-00001形式）
  - [x] `price` → `costPrice`（原価単価）に名称変更
  - [x] `stock` → `quantity`（個数）に名称変更
  - [x] `description` → `specification`（仕様）に名称変更
  - [x] 新規フィールド追加:
    - `fabricColor`（張地/カラー）: Text型
    - `listPrice`（定価単価）: Decimal型
    - `arrivalDate`（入荷年月）: String型
    - `notes`（備考）: Text型
    - `unitId`（単位ID）: 外部キー
    - `locationId`（場所ID）: 外部キー
- [x] Supplierモデル → Manufacturerモデルに変更
  - [x] 名称のみに簡略化（contactName, email, phone を削除）
  - [x] テーブル名: `manufacturers`
- [x] Tagモデル → Locationモデルに変更
  - [x] テーブル名: `locations`
  - [x] 商品との関係を多対多から1対多に変更
- [x] ProductTagモデルを廃止
- [x] Unitモデル（新規）を追加
  - [x] id, name, products
  - [x] テーブル名: `units`

#### マイグレーション
- [x] マイグレーションファイル作成
  ```bash
  npx prisma migrate dev --name v2_data_restructure
  ```
- [x] 既存データのバックアップ
- [x] マイグレーション実行

#### シードデータ更新
- [x] `prisma/seed.ts`を更新
  - [x] CSVファイル（在庫表2025.10 - 在庫一覧.csv）からインポート
  - [x] 「列1」カラムはスキップ（不要）
  - [x] メーカー、品目、場所、単位のマスタを自動作成
  - [x] SKU自動採番（SKU-00001から開始）
  - [x] 仕様　張地/カラー → specification + fabricColor にマッピング

#### 単位マスタ初期データ
- [x] 単位データを作成
  | ID | 名称 |
  |----|------|
  | 1 | 台 |
  | 2 | 個 |
  | 3 | 枚 |
  | 4 | 脚 |
  | 5 | 式 |
  | 6 | 本 |
  | 7 | 点 |
  | 8 | 箱 |
  | 9 | 冊 |
  | 10 | セット |

#### 場所マスタ初期データ
- [x] 場所データを作成
  | ID | 名称 |
  |----|------|
  | 1 | SRバックヤード |
  | 2 | 粟崎 |
  | 3 | リンテルノ展示 |
  | 4 | 不明・破棄 |
  | 5 | 貸出 |

### 2.0-2 SKU自動採番

- [x] SKU採番ロジック実装
  - [x] `lib/utils/sku.ts`を作成
    ```typescript
    async function generateSku(): Promise<string>
    ```
  - [x] 形式: `SKU-NNNNN`（5桁ゼロ埋め）
  - [x] 1から開始
- [x] 商品作成APIにSKU自動採番を統合
  - [x] リクエストからSKUを削除（自動生成）
  - [x] SKUフィールドのバリデーションを削除
- [x] 商品フォームからSKU入力を削除
  - [x] SKUは表示のみ（編集不可）
  - [x] 新規登録時は「自動採番されます」と表示



### 2.0-3 商品一覧画面更新

#### テーブルビュー更新
- [x] `app/(dashboard)/products/page.tsx`を更新
  - [x] 旧列: 商品名、SKU、価格、在庫数、カテゴリ、仕入先
  - [x] 新列（優先表示）:
    - メーカー
    - 品目
    - 商品名
    - 仕様（省略表示）
    - 個数
    - 原価単価
    - 場所
  - [x] テーブルのカラム幅を調整

#### 写真ビュー追加
- [x] `components/products/ProductGridView.tsx`を作成（将来対応）

#### フィルタリング更新
- [x] フィルタをv2.0に更新
  - [x] メーカー（セレクト）
  - [x] 品目（セレクト）
  - [x] 場所（セレクト）
  - [x] 在庫状態フィルタを削除

### 2.0-4 商品フォーム更新

- [x] `app/(dashboard)/products/new/page.tsx`を更新
  - [x] SKU入力を削除（自動採番表示のみ）
  - [x] 新フィールド:
    - 商品名（必須）
    - メーカー（セレクト）
    - 品目（セレクト）
    - 仕様（テキストエリア）
    - 張地/カラー（テキストエリア）
    - 個数（数値入力）
    - 単位（セレクト）
    - 原価単価（必須）
    - 定価単価
    - 入荷年月
    - 場所（セレクト）
    - 備考（テキストエリア）
    - 画像アップロード
- [x] `lib/validations/product.ts`を更新
  - [x] productSchemaV2を追加
  - [x] 新フィールドのバリデーション追加

### 2.0-5 ダッシュボード更新

#### 在庫アラート廃止
- [x] `app/api/dashboard/low-stock/route.ts`を削除
- [x] `components/dashboard/LowStockAlert.tsx`を削除
- [x] ダッシュボードから在庫アラートセクションを削除

#### 全商品原価合計表示
- [x] `app/api/dashboard/stats/route.ts`を更新
  - [x] `totalCost`を追加（全商品の原価単価×個数の合計）
  - [x] `totalStock`を`totalQuantity`に名称変更
  - [x] レスポンス:
    ```json
    {
      "totalProducts": 723,
      "totalCategories": 45,
      "totalCost": "12345678.00"
    }
    ```
- [x] ダッシュボードに全商品原価合計カードを追加

#### メーカー別原価合計
- [x] `app/api/dashboard/cost-by-manufacturer/route.ts`を作成
  - [x] GET: メーカー別の原価合計を取得
  - [x] クエリパラメータ: `sort` (asc/desc)
  - [x] レスポンス:
    ```json
    {
      "data": [
        { "manufacturerId": "...", "manufacturerName": "アルフレックス", "totalCost": "3500000.00" }
      ]
    }
    ```
- [x] `components/dashboard/CostByManufacturer.tsx`を作成
  - [x] メーカー別原価合計リスト表示
  - [x] ソート切り替えボタン（金額順 昇順/降順）
- [x] ダッシュボードにメーカー別原価合計セクションを追加

#### ダッシュボードレイアウト更新
- [x] `app/(dashboard)/dashboard/page.tsx`を更新
  - [x] 統計カード:
    - 商品総数
    - 品目数
    - 全商品原価合計
  - [x] メーカー別原価合計（ソート可能）
  - [x] 最近の更新

### 2.0-6 API更新

#### 商品API
- [x] `app/api/products/route.ts`を更新（GET）
  - [x] クエリパラメータ変更:
    - `supplierId` → `manufacturerId`
    - `tagId` → `locationId`
    - 新規: `arrivalDate`
  - [x] レスポンス形式を新フィールドに対応
    - manufacturer (旧supplier)
    - location (旧tags)
    - unit (新規)
    - costPrice, listPrice, totalCost
    - specification, fabricColor, arrivalDate, notes
- [x] `app/api/products/route.ts`を更新（POST）
  - [x] SKU自動採番を統合
  - [x] リクエストボディの新フィールド対応
- [x] `app/api/products/[id]/route.ts`を更新（GET, PUT, DELETE）
  - [x] 新フィールド対応

#### 仕入先API → メーカーAPI
- [x] `app/api/suppliers/`を`app/api/manufacturers/`にリネーム
- [x] エンドポイント変更:
  - GET /api/manufacturers
  - POST /api/manufacturers
  - GET /api/manufacturers/:id
  - PUT /api/manufacturers/:id
  - DELETE /api/manufacturers/:id
- [x] レスポンスからcontactName, email, phoneを削除

#### タグAPI → 場所API
- [x] `app/api/tags/`を`app/api/locations/`にリネーム
- [x] エンドポイント変更:
  - GET /api/locations
  - POST /api/locations
  - GET /api/locations/:id
  - PUT /api/locations/:id
  - DELETE /api/locations/:id

#### 単位API（新規）
- [x] `app/api/units/route.ts`を作成
  - GET: 単位一覧取得
  - POST: 単位新規作成
- [x] `app/api/units/[id]/route.ts`を作成
  - GET: 単位詳細取得
  - PUT: 単位更新
  - DELETE: 単位削除

### 2.0-7 管理画面更新

#### サイドバー更新
- [x] `components/layout/Sidebar.tsx`を更新
  - [x] 新メニュー:
    - ダッシュボード
    - 商品
    - 品目（旧カテゴリ）
    - メーカー（旧仕入先）
    - 場所（旧タグ）
    - 単位（新規）

#### メーカー管理画面
- [x] `app/(dashboard)/manufacturers/page.tsx`を作成
  - [x] メーカー一覧テーブル
  - [x] 新規作成・編集・削除機能

#### 場所管理画面
- [x] `app/(dashboard)/locations/page.tsx`を作成
  - [x] 場所一覧テーブル
  - [x] 新規作成・編集・削除機能

#### 単位管理画面（新規）
- [x] `app/(dashboard)/units/page.tsx`を作成
  - [x] 単位一覧テーブル
  - [x] 新規作成・編集・削除機能

#### 旧ページ削除
- [x] `app/(dashboard)/suppliers/`を削除
- [x] `app/(dashboard)/tags/`を削除

### 2.0-8 バリデーション更新

- [x] `lib/validations/product.ts`を更新
  - [x] productSchemaV2を追加（新フィールドのZodスキーマ）
  - [x] SKUバリデーションを削除（自動採番）
- [x] API内にバリデーション実装
  - [x] メーカー: 名前のみ必須
  - [x] 場所: 名前のみ必須
  - [x] 単位: 名前のみ必須

### 2.0-9 テスト

#### 単体テスト
- [x] `tests/unit/sku-generation.test.ts`を作成
  - [x] SKU採番ロジックのテスト
- [x] `tests/unit/product-validation-v2.test.ts`を作成
  - [x] 新フィールドのバリデーションテスト

#### 統合テスト
- [x] `tests/integration/products-v2.test.ts`を作成
  - [x] 新フィールドでの商品CRUD操作テスト
  - [x] SKU自動採番のテスト
- [x] `tests/integration/manufacturers.test.ts`を作成
- [x] `tests/integration/locations.test.ts`を作成
- [x] `tests/integration/units.test.ts`を作成
- [x] `tests/integration/dashboard-v2.test.ts`を作成
  - [x] 原価合計計算のテスト
  - [x] メーカー別原価合計のテスト

#### E2Eテスト
- [x] `tests/e2e/products-v2.spec.ts`を作成
  - [x] テーブルビュー表示テスト
  - [x] 写真ビュー表示テスト
  - [x] ビュー切り替えテスト
  - [x] 新フィルタ条件のテスト
- [x] `tests/e2e/dashboard-v2.spec.ts`を作成
  - [x] 原価合計表示テスト
  - [x] メーカー別原価合計ソートテスト

### 2.0-10 ドキュメント更新

- [x] `README.md`を更新
  - [x] v2.0の変更点を記載
- [x] `CLAUDE.md`セクション3-7を更新（v2.0対応）
  - [x] 旧データモデルを新データモデルに置き換え
  - [x] 画面設計を更新
  - [x] API設計を更新

---

## Phase 2.1: 印刷レイアウト & スマホUI対応

### 2.1-1 商品一覧の選択機能
- [x] 商品一覧にチェックボックス（行/全件）を追加
- [x] フィルタ結果の全件一括選択/解除（ページ外も含む）
- [x] 選択状態の保持（ページ移動/検索/フィルタ変更時の挙動定義）

### 2.1-2 印刷レイアウトビュー
- [x] 商品一覧のビュー切り替え横に「印刷」ボタンを追加
- [x] 印刷ビュー（A4、2列×2行、4件/ページ）を作成
- [x] 表示項目: 商品写真、メーカー、商品名、仕様、張地/カラー、定価、個数、単位、備考
- [x] 選択済み商品のみ印刷対象にする
- [x] 印刷用CSS（@page、余白、改ページ制御）を整備

### 2.1-3 PDF出力
- [x] PDF出力方式の決定（ブラウザ印刷 or 生成API）
- [x] PDF出力ボタンを追加
- [ ] 出力内容が印刷レイアウトと一致することを確認

### 2.1-4 スマホUI対応
- [x] 商品一覧のレスポンシブ調整（検索/フィルタ/ボタン配置）
- [x] 印刷ボタンはスマホで非表示 or 無効化
- [x] 主要画面の最小可読性を担保（テーブル/グリッド）

### 2.1-5 テスト
- [ ] 複数選択の動作確認（ページ移動/フィルタ変更含む）
- [ ] 印刷レイアウトのページ分割確認（4件/ページ）
- [ ] PDF出力の確認

---

## メモ・注意事項

### 開発環境
- Node.js: v18以上
- npm: v9以上
- PostgreSQL: v14以上

### コーディング規約
- TypeScript strict mode有効
- ESLint + Prettierでコード品質維持
- コンポーネントは関数コンポーネントで実装
- APIルートはRoute Handlersを使用

### セキュリティチェックリスト
- [ ] パスワードはbcryptでハッシュ化
- [ ] セッションはHttpOnly Cookieで管理
- [ ] 入力値はZodで検証
- [ ] XSS対策（Reactの標準エスケープ）
- [ ] SQLインジェクション対策（Prismaのパラメータ化クエリ）
- [ ] CSRF対策（SameSite=Lax Cookie）

### パフォーマンス最適化
- [ ] 画像の遅延読み込み
- [ ] ページネーションの実装
- [ ] データベースインデックスの最適化
- [ ] Next.js画像最適化の活用

---

**最終更新日**: 2026-01-03
**バージョン**: 2.2.0
