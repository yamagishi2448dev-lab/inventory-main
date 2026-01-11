# Data Model (v2.0)

## Naming (v2.0)
- Supplier → Manufacturer（メーカー）
- Category → 品目（用途変更）
- Tag → Location（場所）
- Unit（単位）追加

## Core Entities

### Product
- 必須: `name`, `costPrice`
- 自動採番: `sku`（`SKU-00001`形式、編集不可）
- 数量系: `quantity`（旧stock、0以上、デフォルト0）
- 参照: `manufacturerId`, `categoryId`, `locationId`, `unitId`（いずれも任意）
- 追加項目: `specification`, `fabricColor`, `arrivalDate`, `notes`, `images[]`
- `arrivalDate`: 例 `2024年1月` の文字列
- `costPrice`/`listPrice`: Decimal(10,2)（`listPrice`は任意）
- 監査: `createdAt`, `updatedAt`
- 計算フィールド: `totalCost = costPrice * quantity`

### Master Data
- Manufacturer: `id`, `name`
- Category: `id`, `name`
- Location: `id`, `name`
- Unit: `id`, `name`

### Other
- ProductImage: `productId`, `url`, `order`
- User / Session

## Indexes (期待)
- `sku`, `name`, `manufacturerId`, `categoryId`, `locationId`

## SKU Auto Generation
- 形式: `SKU-NNNNN`（5桁ゼロ埋め）
- 採番: 既存SKUの最大値 + 1
- 既存データ移行時: 商品ID順で再採番

## Master Data Seed (参考)
- Unit: 台, 個, 枚, 脚, 式, 本, 点, 箱, 冊, セット
- Location: SRバックヤード, 粟崎, リンテルノ展示, 不明・破棄, 貸出

## v1との差分（要点）
- SKUは自動採番に統一（手動入力なし）
- 写真ビュー追加、在庫アラート廃止
- フィールド構成を業務実態に合わせて刷新
