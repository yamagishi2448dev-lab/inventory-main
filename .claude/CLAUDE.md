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
- 目的: 商品マスタを中心に、品目・メーカー・場所・単位・画像を一元管理
- スタイル: シンプル、直感的、将来拡張可能

## 2. 主要ロール
- **ADMIN**: 全機能 + ユーザー管理
- **USER**: 商品/マスタデータのCRUD（ユーザー管理は不可）

## 3. 技術・運用制約（必須）
- Next.js 14+（App Router）, React 19, TypeScript
- Prisma ORM
- 認証: セッションベース（DB永続化 + Cookieにランダムトークンのみ保存）
- パスワード: bcryptでハッシュ化
- APIレスポンス: JSON + `Content-Type: application/json; charset=utf-8`
- DB: PostgreSQL（開発環境も含めSQLiteは使用禁止）
- デプロイ: Vercel

## 4. データモデル（v2.1 現行）
> 旧呼称: Supplier → Manufacturer, Category → 品目, Tag → Location

### 4.1 Product
- `sku` 自動採番（`SKU-00001` 形式、編集不可）
- 主な項目: name, manufacturerId, categoryId, specification, fabricColor, quantity, unitId,
  costPrice, listPrice, arrivalDate, locationId, notes, images[], materials[]
- 追加項目: size, isSold, soldAt

### 4.2 Consignment（委託品）
- `sku` 自動採番（`CSG-00001` 形式、編集不可）
- Productと同等の構造、原価単価は常に0
- images[], materials[], isSold, soldAt を含む

### 4.3 Material
- MaterialType: name, order
- ProductMaterial / ConsignmentMaterial: materialTypeId, description, imageUrl, order

### 4.4 Master Data
- Manufacturer（メーカー）: name
- Category（品目）: name
- Location（場所）: name
- Unit（単位）: name

### 4.5 System
- ChangeLog: entityType, entityId, action, changes, user, createdAt
- SystemSetting: key, value（運用ルール）

## 5. 機能要件（要約）
- 認証/ユーザー管理、商品/委託品管理、素材項目管理、変更履歴、運用ルール、マスタ管理、ダッシュボード、印刷レイアウト
- 詳細は `./rules/functional-requirements.md`

## 6. API共通仕様（要約）
- ベース: `/api`、認証必須（`/api/auth/*`除く）
- 詳細は `./rules/api-spec.md`

## 7. 非機能要件（要約）
- 画像: JPEG/PNG/WebP, 最大5MB, 5枚/商品
- 対応ブラウザ: 最新Chrome/Firefox/Safari/Edge
- レスポンシブ: スマホ対応（印刷は非対応）

---

**最終更新日**: 2026-01-07
**バージョン**: 2.1.0

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
