# Inventory - 在庫管理システム 仕様書（プロジェクト記憶）

この文書は**開発仕様の要約**です。詳細仕様は `./rules/` を参照してください。
実装手順・進捗・チェックリストは `TODO.md` に集約されているため、ここでは重複しません。
仕様とTODOが競合する場合は**本仕様書を優先**します。

関連ルール:
- `./rules/project-context.md`
- `./rules/data-model.md`
- `./rules/functional-requirements.md`
- `./rules/api-spec.md`
- `./rules/ui-and-structure.md`
- `./rules/code-style.md`
- `./rules/testing.md`
- `./rules/security.md`
- `./rules/references.md`

---

## 1. 概要
- 対象: 個人・小規模ビジネス（2-10名）の在庫管理
- 目的: 商品・委託品を中心に、品目・メーカー・場所・単位・タグ・素材・画像を一元管理
- スタイル: シンプル、直感的、将来拡張可能

## 2. 主要ロール
- **ADMIN**: 全機能 + ユーザー管理 + システム設定
- **USER**: 商品/委託品/マスタデータのCRUD（ユーザー管理は不可）

## 3. 技術・運用制約（必須）
- Next.js 16+（App Router）, React 19, TypeScript 5.9+
- Prisma 5.22+ ORM
- 認証: セッションベース（DB永続化 + Cookieにランダムトークンのみ保存）
- パスワード: bcryptでハッシュ化
- APIレスポンス: JSON + `Content-Type: application/json; charset=utf-8`
- DB: PostgreSQL（開発環境も含めSQLiteは使用禁止）
- 画像保存: Cloudinary（本番環境）
- デプロイ: Vercel
- UIコンポーネント: shadcn/ui + Radix UI + Tailwind CSS

## 4. データモデル（v2.3 現行）
> 旧呼称: Supplier → Manufacturer, Category → 品目, Tag（v1）→ Location

### 4.1 Product（商品）
- `sku` 自動採番（`SKU-00001` 形式、編集不可）
- 必須項目: name, costPrice
- 主な項目: manufacturerId, categoryId, specification, size, fabricColor, quantity, unitId,
  costPrice, listPrice, arrivalDate, locationId, designer, notes
- リレーション: images[], materials[], tags[]
- フラグ: isSold, soldAt
- 監査: createdAt, updatedAt

### 4.2 Consignment（委託品）
- `sku` 自動採番（`CSG-00001` 形式、編集不可）
- Productと同等の構造、costPriceは常に0
- images[], materials[], tags[], isSold, soldAt を含む

### 4.3 Material（素材）
- MaterialType: id, name, order（素材項目マスタ）
- ProductMaterial: productId, materialTypeId, description, imageUrl, order
- ConsignmentMaterial: consignmentId, materialTypeId, description, imageUrl, order

### 4.4 Tag（タグ）
- Tag: id, name, createdAt, updatedAt
- ProductTag: productId, tagId（多対多中間テーブル、複合ユニーク制約）
- ConsignmentTag: consignmentId, tagId（多対多中間テーブル、複合ユニーク制約）
- 商品・委託品に複数タグを付与可能
- タグによるフィルタリング（OR条件）

### 4.5 Master Data（マスタデータ）
- Manufacturer（メーカー）: id, name, products[], consignments[]
- Category（品目）: id, name, products[], consignments[]
- Location（場所）: id, name, products[], consignments[]
- Unit（単位）: id, name, products[], consignments[]
- 各マスタは商品・委託品の両方から参照される

### 4.6 Image（画像）
- ProductImage: id, productId, url, order（Cascade削除）
- ConsignmentImage: id, consignmentId, url, order（Cascade削除）

### 4.7 System（システム）
- ChangeLog: entityType, entityId, entityName, entitySku, action, changes(JSON), userId, userName, createdAt
- SystemSetting: id, key(unique), value, updatedAt（SKU採番カウンター等）
- User: id, username, passwordHash, role, createdAt, sessions[]
- Session: id, userId, tokenHash, expiresAt, createdAt

## 5. 機能要件（要約）
- 認証/ユーザー管理（ログイン、ログアウト、パスワード変更、ユーザーCRUD）
- 商品管理（CRUD、SKU自動採番、画像・素材・タグ管理、販売済みフラグ）
- 委託品管理（商品と同等の機能、costPrice=0固定）
- 素材項目管理（MaterialType CRUD、表示順管理）
- タグ管理（CRUD、商品・委託品への複数タグ付与）
- 変更履歴（商品・委託品の作成/更新/削除を記録）
- マスタ管理（メーカー/品目/場所/単位のCRUD）
- ダッシュボード（統計、メーカー別原価合計、最近の変更）
- 印刷レイアウト（A4 2x2、選択商品のみ）
- CSVインポート/エクスポート（商品・委託品、タグ対応、マスタ自動作成）
- 一括操作（複数選択、一括削除、一括編集）
- 詳細は `./rules/functional-requirements.md`

## 6. API共通仕様（要約）
- ベース: `/api`
- 認証必須（`/api/auth/*`除く）
- エンドポイント数: 約50
- 詳細は `./rules/api-spec.md`

## 7. 非機能要件（要約）
- 画像: JPEG/PNG/WebP, 最大5MB, 5枚/商品
- 対応ブラウザ: 最新Chrome/Firefox/Safari/Edge
- レスポンシブ: スマホ対応（印刷は非対応）
- データ目安: 商品10,000件、マスタ各100-200件

## 8. 環境変数
| 変数名 | 説明 | 必須 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL接続URL（Transaction pooler） | 必須 |
| `DIRECT_URL` | PostgreSQL直接接続URL（マイグレーション用） | 必須 |
| `SESSION_SECRET` | セッション暗号化キー | 必須 |
| `NEXT_PUBLIC_APP_URL` | アプリケーションURL | 必須 |
| `CLOUDINARY_CLOUD_NAME` | Cloudinaryクラウド名 | 本番必須 |
| `CLOUDINARY_API_KEY` | Cloudinary APIキー | 本番必須 |
| `CLOUDINARY_API_SECRET` | Cloudinary APIシークレット | 本番必須 |
| `DEV_AUTO_SEED_ADMIN` | 開発用自動シード | 任意 |
| `DEV_ADMIN_USERNAME` | 開発用管理者名 | 任意 |
| `DEV_ADMIN_PASSWORD` | 開発用管理者パスワード | 任意 |

---

**最終更新日**: 2026-01-31
**バージョン**: 2.3.0

---

## 運用メモ（トラブル/作業メモ）
- 本番で商品詳細の「販売済み」トグル後にクライアント側でクラッシュ。
  TypeError: Cannot read properties of undefined (reading 'toLocaleString')。
  原因はPUTレスポンスが `{ success: true, product: ... }` なのに詳細画面が
  直接 `product` として扱っていたこと。`response.product || response` で解消。
- ローカルの `next dev` 起動で `.next/dev/lock` が残り起動不可。
  既存の `next dev` プロセスを止めてから再起動が必要。
- `AGENTS.md` が `CLAUDE.md` を参照していたが、初期確認時に場所が見つからず。
  実際は `Inventory/.claude/CLAUDE.md` に配置されていた。
