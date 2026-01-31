# Inventory - 在庫管理システム

個人・小規模ビジネス向けのシンプルで使いやすい在庫管理システム

## 技術スタック

- **Next.js 16+** (App Router)
- **React 19**
- **TypeScript 5.9+**
- **Prisma 5.22+** (ORM)
- **PostgreSQL**
- **shadcn/ui** (UIコンポーネント)
- **Tailwind CSS 3.4+**
- **Cloudinary** (画像ホスティング)

## 必要要件

- Node.js 18以上
- npm 9以上
- Git
- PostgreSQL（開発環境含む）

## 主要機能（v2.3）

### 商品・委託品管理
- 商品/委託品のCRUD操作
- SKU自動採番（商品: `SKU-00001`、委託品: `CSG-00001`）
- 画像管理（最大5枚、ドラッグ&ドロップ対応）
- 素材情報管理（説明+画像）
- タグによる分類（複数タグ付与、OR条件フィルタ）
- 販売済み管理（フラグ+日時）

### 一覧・検索
- テーブルビュー / グリッドビュー切替
- 検索（商品名/仕様の部分一致）
- フィルタ（メーカー/品目/場所/タグ/販売済み）
- ソート（各カラム）
- ページネーション（20件/ページ）

### 一括操作
- 複数選択（チェックボックス）
- 全件選択（フィルタ結果、最大100件）
- 一括削除
- 一括編集（場所/メーカー/品目/タグ/個数）

### CSVインポート/エクスポート
- BOM付きUTF-8（Excel対応）
- タグはパイプ区切り（`タグ1|タグ2`）
- マスタデータ自動作成

### マスタデータ管理
- メーカー（仕入先・ブランド）
- 品目（商品分類）
- 場所（保管場所）
- 単位（数量単位）
- タグ（分類ラベル）
- 素材項目（張地、木部など）

### ダッシュボード
- 統計情報（商品総数、品目数、メーカー数、原価合計）
- メーカー別原価合計
- 最近の変更履歴

### 印刷
- A4固定レイアウト（2列×2行=4件/ページ）
- 選択商品/委託品のみ印刷

### ユーザー管理（ADMIN権限）
- ユーザーCRUD
- パスワードリセット
- ロール管理（ADMIN/USER）

---

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

### 4. 画面の見方

- **ダッシュボード**: 全体の概要とコスト集計を確認
- **商品一覧**: 追加・編集・検索・印刷の入口
- **委託品一覧**: 委託品（原価0）の管理
- **マスタ管理**: メーカー / 品目 / 場所 / 単位 / タグ / 素材項目

---

## セットアップ

### 1. 環境変数の設定

`.env`ファイルを作成して、以下の環境変数を設定してください：

```bash
# データベース接続URL（PostgreSQL）
DATABASE_URL="postgresql://user:password@localhost:5432/inventory"

# マイグレーション用の直結URL
DIRECT_URL="postgresql://user:password@localhost:5432/inventory"

# セッション暗号化キー（ランダムな文字列）
SESSION_SECRET="your-secret-key-here"

# アプリケーションURL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cloudinary設定（本番環境用）
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
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

---

## 開発

### 開発サーバー起動

```bash
make dev
```

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

### テスト

```bash
# 単体・統合テスト
npm run test

# E2Eテスト
npm run test:e2e

# カバレッジ
npm run test:coverage
```

---

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

| 変数名 | 説明 |
|--------|------|
| `DATABASE_URL` | PostgreSQL接続URL |
| `DIRECT_URL` | PostgreSQL直接接続URL |
| `SESSION_SECRET` | セッション暗号化キー |
| `NEXT_PUBLIC_APP_URL` | アプリケーションURL |
| `CLOUDINARY_CLOUD_NAME` | Cloudinaryクラウド名 |
| `CLOUDINARY_API_KEY` | Cloudinary APIキー |
| `CLOUDINARY_API_SECRET` | Cloudinary APIシークレット |

---

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

---

## プロジェクト構造

```
inventory/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 認証関連ページ
│   ├── (dashboard)/       # ダッシュボード関連ページ
│   │   ├── products/      # 商品管理
│   │   ├── consignments/  # 委託品管理
│   │   ├── manufacturers/ # メーカー管理
│   │   ├── categories/    # 品目管理
│   │   ├── locations/     # 場所管理
│   │   ├── units/         # 単位管理
│   │   ├── tags/          # タグ管理
│   │   ├── material-types/# 素材項目管理
│   │   └── admin/         # 管理者コンソール
│   └── api/               # API Routes（約74エンドポイント）
├── components/            # Reactコンポーネント
│   ├── ui/               # shadcn/uiコンポーネント
│   ├── layout/           # レイアウトコンポーネント
│   ├── products/         # 商品関連コンポーネント
│   ├── consignments/     # 委託品関連コンポーネント
│   └── dashboard/        # ダッシュボードコンポーネント
├── lib/                   # ユーティリティ・ヘルパー
│   ├── auth/             # 認証関連
│   ├── db/               # データベース
│   ├── validations/      # バリデーション（Zod）
│   ├── utils/            # ユーティリティ
│   └── hooks/            # カスタムフック
├── prisma/               # Prismaスキーマとマイグレーション
├── tests/                # テストファイル
│   ├── unit/             # 単体テスト
│   ├── integration/      # 統合テスト
│   └── e2e/              # E2Eテスト
├── public/               # 静的ファイル
└── Makefile              # タスクランナー
```

---

## 用語の説明

| 用語 | 説明 |
|------|------|
| メーカー | 仕入先・ブランド名 |
| 品目 | 商品の分類（例: ソファ、チェア） |
| 場所 | 保管場所 |
| 単位 | 数量の単位（例: 台、個） |
| タグ | 商品の分類ラベル（複数付与可能） |
| 素材項目 | 素材の種類（例: 張地、木部） |
| 委託品 | 原価0の商品（委託販売用） |

---

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

```bash
# マイグレーション適用（Vercel）
npm run db:migrate:deploy

# 初期データ投入（必要な場合のみ）
npm run db:seed
```

### バックアップ方針（目安）

- Vercel Postgresのバックアップ設定を有効化
- 重要な変更前は手動バックアップを実施

---

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

### `.next/dev/lock`エラー

```bash
# 既存のnext devプロセスを停止してから再起動
# Windows: タスクマネージャーでnode.exeを終了
# Mac/Linux: pkill -f "next dev"
make dev
```

---

## ドキュメント

- **[.claude/CLAUDE.md](./.claude/CLAUDE.md)** - 詳細な仕様書
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - デプロイメントガイド
- **[TODO.md](./TODO.md)** - 実装計画と進捗

---

## バージョン履歴

| バージョン | 主な変更 |
|-----------|---------|
| v2.3.0 | designerフィールド追加 |
| v2.2.0 | タグ機能追加 |
| v2.1.0 | 委託品、素材、変更履歴、システム設定追加 |
| v2.0.0 | 命名変更、SKU自動採番、Unit追加 |
| v1.0.0 | 初期リリース |

---

## ライセンス

MIT
