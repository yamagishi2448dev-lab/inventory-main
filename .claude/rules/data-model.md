# Data Model (v2.2)

## Naming History
- v1 → v2.0: Supplier → Manufacturer（メーカー）, Category → 品目（用途変更）, Tag → Location（場所）, Unit（単位）追加
- v2.2: Tag機能を新規追加（Locationとは別機能）

## Core Entities

### Product
- 必須: `name`, `costPrice`
- 自動採番: `sku`（`SKU-00001`形式、編集不可）
- 数量系: `quantity`（旧stock、0以上、デフォルト0）
- 参照: `manufacturerId`, `categoryId`, `locationId`, `unitId`（いずれも任意）
- 追加項目: `specification`, `fabricColor`, `arrivalDate`, `notes`, `images[]`, `materials[]`, `tags[]`
- 販売管理: `isSold`, `soldAt`
- `arrivalDate`: 例 `2024年1月` の文字列
- `costPrice`/`listPrice`: Decimal(10,2)（`listPrice`は任意）
- 監査: `createdAt`, `updatedAt`
- 計算フィールド: `totalCost = costPrice * quantity`

### Consignment（委託品、v2.1追加）
- Productと同等の構造
- 自動採番: `sku`（`CSG-00001`形式、編集不可）
- 原価単価は常に0
- `images[]`, `materials[]`, `tags[]`, `isSold`, `soldAt` を含む

### Material（v2.1追加）
- MaterialType: `id`, `name`, `order`（素材項目マスタ）
- ProductMaterial: `productId`, `materialTypeId`, `description`, `imageUrl`, `order`
- ConsignmentMaterial: `consignmentId`, `materialTypeId`, `description`, `imageUrl`, `order`

### Tag（v2.2追加）
- Tag: `id`, `name`, `createdAt`, `updatedAt`
- ProductTag: `productId`, `tagId`（多対多中間テーブル）
- ConsignmentTag: `consignmentId`, `tagId`（多対多中間テーブル）
- 商品・委託品に複数タグ付与可能
- フィルタリング時はOR条件（いずれかのタグを持つアイテムを表示）

### Master Data
- Manufacturer: `id`, `name`
- Category: `id`, `name`
- Location: `id`, `name`
- Unit: `id`, `name`

### System（v2.1追加）
- ChangeLog: `entityType`, `entityId`, `entityName`, `entitySku`, `action`, `changes`, `userId`, `userName`, `createdAt`
- SystemSetting: `key`, `value`, `updatedAt`

### Other
- ProductImage: `productId`, `url`, `order`
- ConsignmentImage: `consignmentId`, `url`, `order`
- User / Session

## Indexes (期待)
- `sku`, `name`, `manufacturerId`, `categoryId`, `locationId`, `isSold`
- Tag関連: `productId`, `tagId`, `consignmentId`

## SKU Auto Generation
- Product: `SKU-NNNNN`（5桁ゼロ埋め）
- Consignment: `CSG-NNNNN`（5桁ゼロ埋め）
- 採番: 既存SKUの最大値 + 1
- 既存データ移行時: ID順で再採番

## Master Data Seed (参考)
- Unit: 台, 個, 枚, 脚, 式, 本, 点, 箱, 冊, セット
- Location: SRバックヤード, 粟崎, リンテルノ展示, 不明・破棄, 貸出
- Tag: 玉家建設用（初期タグ）

## Version History
- v1: 基本機能
- v2.0: SKU自動採番、フィールド構成刷新、写真ビュー追加、在庫アラート廃止
- v2.1: 委託品、素材管理、変更履歴、システム設定、販売済み管理
- v2.2: タグ機能（商品・委託品への複数タグ付与、フィルタリング、CSVインポート/エクスポート対応）
