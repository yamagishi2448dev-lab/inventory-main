# UI & Structure

## Screens (Summary)
- `/login`: ロゴ/タイトル、ユーザー名、パスワード、ログイン、エラー表示
- `/dashboard`: 統計カード、メーカー別原価合計、最近の更新
- `/products`: 検索/フィルタ（タグ含む）、ビュー切替（テーブル/写真）、印刷ボタン、CSVインポート/エクスポート
- `/products/new`: 商品登録フォーム（タグ選択含む）
- `/products/:id`: 商品詳細（画像ギャラリー、マスタ参照、タグ表示）
- `/products/:id/edit`: 商品編集フォーム（タグ編集含む）
- `/consignments`: 委託品一覧（商品一覧と同等機能）
- `/consignments/new`, `/consignments/:id`, `/consignments/:id/edit`: 委託品CRUD
- `/manufacturers`, `/categories`, `/locations`, `/units`, `/tags`: 各マスタのCRUD画面
- `/admin/console`: ユーザー管理（ADMIN専用）

## UI Notes
- ヘッダー右上メニューから管理者コンソール/パスワード変更にアクセス
- ユーザー一覧のロールバッジ: ADMIN=赤, USER=グレー
- 印刷レイアウトはA4固定（スマホ印刷は非対応）
- タグはバッジ形式で表示
- CSVインポート/エクスポートボタンは商品・委託品一覧に配置

## Directory Structure (Key Paths)
- `app/(auth)/login/page.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/products/*`
- `app/(dashboard)/consignments/*`
- `app/(dashboard)/manufacturers`, `categories`, `locations`, `units`, `tags`
- `app/(dashboard)/admin/console/page.tsx`
- `app/api/*` (auth, products, consignments, tags, master data, upload, dashboard)
- `components/layout/*`, `components/products/*`, `components/consignments/*`, `components/ui/*`
- `lib/auth/*`, `lib/db/*`, `lib/validations/*`, `lib/products/*`, `lib/consignments/*`
- `lib/google-drive.ts` (本番環境用画像保存)
- `prisma/schema.prisma`, `prisma/migrations/*`, `prisma/seed.ts`
- `tests/unit`, `tests/integration`, `tests/e2e`
