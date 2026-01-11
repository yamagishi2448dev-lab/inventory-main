# UI & Structure

## Screens (Summary)
- `/login`: ロゴ/タイトル、ユーザー名、パスワード、ログイン、エラー表示
- `/dashboard`: 統計カード、メーカー別原価合計、最近の更新
- `/products`: 検索/フィルタ、ビュー切替（テーブル/写真）、印刷ボタン
- `/products/new`: 商品登録フォーム
- `/products/:id`: 商品詳細（画像ギャラリー、マスタ参照）
- `/products/:id/edit`: 商品編集フォーム
- `/manufacturers`, `/categories`, `/locations`, `/units`: 各マスタのCRUD画面

## UI Notes
- ヘッダー右上メニューから管理者コンソール/パスワード変更にアクセス
- ユーザー一覧のロールバッジ: ADMIN=赤, USER=グレー
- 印刷レイアウトはA4固定（スマホ印刷は非対応）

## Directory Structure (Key Paths)
- `app/(auth)/login/page.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/products/*`
- `app/(dashboard)/manufacturers`, `categories`, `locations`, `units`
- `app/api/*` (auth, products, master data, upload, dashboard)
- `components/layout/*`, `components/products/*`, `components/ui/*`
- `lib/auth/*`, `lib/db/*`, `lib/validations/*`
- `prisma/schema.prisma`, `prisma/migrations/*`, `prisma/seed.ts`
- `tests/unit`, `tests/integration`, `tests/e2e`
