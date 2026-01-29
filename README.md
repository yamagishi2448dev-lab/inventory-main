# Inventory - 在庫管理システム

個人・小規模ビジネス向けのシンプルで使いやすい在庫管理システム

## 技術スタック

- **Next.js 14+** (App Router)
- **React 19**
- **TypeScript**
- **Prisma** (ORM)
- **PostgreSQL**
- **shadcn/ui** (UIコンポーネント)
- **Tailwind CSS**

## 必要要件

- Node.js 18以上
- npm 9以上
- Git

## セットアップ

## クイックスタート（初めての方へ）

### 1. まずは動かす

```bash
# 初期セットアップ（依存関係のインストール + マイグレーション + シードデータ投入）
make setup

# 開発サーバー起動
make dev
```

ブラウザで http://localhost:3000 を開いてください。

### 2. ログイン

デフォルトのログイン情報：
- ユーザー名: `admin`
- パスワード: `admin123`

### 3. 最初にやること

1. 「メーカー」「品目」「場所」「単位」を先に登録
2. 「商品一覧」から商品を追加
3. 検索・フィルタで絞り込み確認
4. 必要なら「印刷」でA4レイアウト出力

### 4. 画面の見方（最小限）

- ダッシュボード: 全体の概要とコスト集計を確認
- 商品一覧: 追加・編集・検索・印刷の入口
- マスタ管理: メーカー / 品目 / 場所 / 単位の管理

### 1. 環境変数の設定

`.env`ファイルを作成して、以下の環境変数を設定してください：

```bash
# データベース接続URL（PostgreSQL）
DATABASE_URL="postgresql://user:password@localhost:5432/inventory"

# マイグレーション用の直結URL（DATABASE_URLと同じ値でOK）
POSTGRES_URL="postgresql://user:password@localhost:5432/inventory"

# セッション暗号化キー（ランダムな文字列）
SESSION_SECRET="your-secret-key-here"
```

```bash
# Optional: start local PostgreSQL with Docker
docker compose up -d
```

### 2. Makefileを使った初期セットアップ

```bash
# ヘルプを表示
make help

# 初期セットアップ（依存関係のインストール + マイグレーション + シードデータ投入）
make setup
```

または、手動で実行する場合：

```bash
# 依存関係のインストール
make install

# データベースマイグレーション
make migrate

# シードデータの投入
make seed
```

## 開発

### その他の開発コマンド

```bash
# Prisma Studioを起動（データベースGUI）
make prisma-studio

# リント実行
make lint

# 型チェック
make typecheck

# フォーマット
make format

# 全チェック（リント + 型チェック + テスト）
make check
```

## ビルド・デプロイ

### ローカルでのビルド

```bash
# プロダクションビルド
make build

# プロダクションサーバー起動
make start
```

### Vercelへのデプロイ

詳細なデプロイ手順については、[DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

#### クイックスタート

```bash
# Vercel CLIのインストール（初回のみ）
npm install -g vercel

# デプロイ
make deploy-vercel

# 本番環境のマイグレーション
make migrate-prod
```

#### 必要な環境変数

Vercelダッシュボードで以下の環境変数を設定してください：

- `DATABASE_URL`: PostgreSQL接続URL（Vercel Postgresで自動設定）
- `SESSION_SECRET`: セッション暗号化キー（`openssl rand -base64 32`で生成）
- `NEXT_PUBLIC_APP_URL`: アプリケーションURL（例: `https://your-app.vercel.app`）

## データベース管理

```bash
# マイグレーション実行
make migrate

# データベースリセット＆マイグレーション
make migrate-reset

# シードデータ投入
make seed

# Prisma Studio起動
make prisma-studio

# Prismaクライアント生成
make prisma-generate
```

## プロジェクト構造

```
inventory/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── (dashboard)/       # ダッシュボード関連ページ
│   └── api/               # API Routes
├── components/            # Reactコンポーネント
│   ├── ui/               # shadcn/uiコンポーネント
│   ├── layout/           # レイアウトコンポーネント
│   └── products/         # 商品関連コンポーネント
├── lib/                   # ユーティリティ・ヘルパー
│   ├── auth/             # 認証関連
│   ├── db/               # データベース
│   └── validations/      # バリデーション
├── prisma/               # Prismaスキーマとマイグレーション
├── public/               # 静的ファイル
└── Makefile              # タスクランナー
```

## 主要機能

### Phase 1-5 + Phase 2.0-2.2 (v2.2実装済み)

- ✅ ユーザー認証（ログイン/ログアウト）
- ✅ 商品管理（CRUD操作）
  - v2.0: メーカー、品目、場所、単位の管理に対応
  - v2.0: SKU自動採番
  - v2.0: 原価・定価管理
  - v2.0: 個数管理
  - v2.1: 販売済み管理、素材項目管理
- ✅ 委託品管理（v2.1追加）
  - 商品と同等の機能
  - SKU形式: CSG-XXXXX
- ✅ タグ機能（v2.2追加）
  - 商品・委託品への複数タグ付与
  - タグによるフィルタリング（OR条件）
- ✅ 検索・フィルタリング
  - v2.0: メーカー、品目、場所によるフィルタ
  - v2.2: タグによるフィルタ
- ✅ CSVインポート/エクスポート（v2.2追加）
  - 商品・委託品の一括データ入出力
  - タグ対応
- ✅ 一括操作
  - 複数商品/委託品の一括編集・削除
- ✅ ダッシュボード（統計情報）
  - v2.0: メーカー別原価合計
  - v2.0: 商品総数、品目数、原価合計の可視化
- ✅ 商品画像アップロード
  - 開発環境: ローカルストレージ
  - 本番環境: Google Drive
- ✅ マスタ管理（メーカー、品目、場所、単位、タグ）
- ✅ 印刷レイアウト（A4、4件/ページ）

## 初めての操作ガイド

### 商品を登録する

1. 「商品一覧」→「新規登録」
2. 必須項目（商品名・原価単価）を入力
3. メーカー/品目/場所/単位はマスタから選択
4. 必要に応じて画像を追加して保存

### 検索・フィルタ

- 検索欄: 商品名 / SKU / 仕様で検索
- フィルタ: メーカー / 品目 / 場所で絞り込み
- ソート: 一覧ヘッダーの矢印で並び替え

### 印刷

1. 一覧で商品を選択
2. 「印刷」を押す
3. A4 4件レイアウトで出力（PCのみ）

## 用語の簡単な説明

- メーカー: 仕入先・ブランド名
- 品目: 商品の分類（例: ソファ、チェア）
- 場所: 保管場所
- 単位: 数量の単位（例: 台、個）

## 運用・保守ガイド

### 日常の確認

- デプロイ状況: Vercelの「Deployments」で最新デプロイの成功/失敗を確認
- エラー確認: Vercelの「Logs」でエラーや警告を確認
- DB状態: Prisma Studioで必要なデータを目視確認

### 定期作業（推奨）

- 依存関係の更新: `npm audit` と `npm update` を定期的に確認
- Prisma更新: メジャー更新はガイドに従って段階的に適用
- 不具合調査: `make lint` / `make typecheck` で早期検知

### 本番データベース運用

- マイグレーション適用（Vercel）
  - `npm run db:migrate:deploy`
- ビルド時にマイグレーションを実行する場合
  - `PRISMA_MIGRATE_DEPLOY=1` を環境変数に設定してデプロイ
- 初期データ投入（必要な場合のみ）
  - `npm run db:seed`

### バックアップ方針（目安）

- Vercel Postgresのバックアップ設定を有効化
- 重要な変更前は手動バックアップを実施

### よくある作業

```bash
# 本番用ビルドが通るか確認
make build

# Prismaクライアントを再生成
make prisma-generate
```

### Phase 6 (Future) - 入出庫管理

- ⏳ 入庫機能
- ⏳ 出庫機能
- ⏳ 在庫履歴・トランザクション
- ⏳ レポート・グラフ機能

## トラブルシューティング

### データベース接続エラー

```bash
# データベースをリセット
make migrate-reset

# シードデータを再投入
make seed
```

### ビルドエラー

```bash
# クリーンアップ
make clean

# 再インストール
make install

# 再ビルド
make build
```

### Prismaクライアントエラー

```bash
# Prismaクライアントを再生成
make prisma-generate
```

## ライセンス

MIT

## ドキュメント

- **[CLAUDE.md](./CLAUDE.md)** - 詳細な仕様書
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - デプロイメントガイド
- **[TODO.md](./TODO.md)** - 実装計画と進捗
