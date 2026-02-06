# Data Model (v3.0)

## Naming History
- v1 → v2.0: Supplier → Manufacturer（メーカー）、Category → 品目（用途変更）、Tag → Location（場所）
- v2.0: Unit（単位）追加
- v2.1: Consignment（委託品）、Material（素材）、ChangeLog（変更履歴）、SystemSetting追加
- v2.2: Tag機能追加（ProductTag、ConsignmentTag）
- v2.3: designerフィールド追加
- **v3.0: Product/Consignment を Item に統合**

## Entity Overview

| モデル | 説明 | 主なフィールド |
|--------|------|----------------|
| **Item** | 統合モデル（商品/委託品）| sku, itemType, name, costPrice?, quantity, images[], materials[], tags[] |
| ItemImage | アイテム画像 | itemId, url, order |
| ItemMaterial | アイテム素材 | itemId, materialTypeId, description, imageUrl, order |
| ItemTag | アイテムタグ中間 | itemId, tagId |
| Manufacturer | メーカー | name, items[] |
| Category | 品目 | name, items[] |
| Location | 場所 | name, items[] |
| Unit | 単位 | name, items[] |
| Tag | タグ | name, itemTags[] |
| MaterialType | 素材項目マスタ | name, order, itemMaterials[] |
| ChangeLog | 変更履歴 | entityType, itemType, action, changes(JSON) |
| SystemSetting | システム設定 | key, value |
| User | ユーザー | username, passwordHash, role |
| Session | セッション | tokenHash, expiresAt |

---

## Core Entity: Item (v3.0)

### Item（統合モデル）
```prisma
enum ItemType {
  PRODUCT      // 商品: costPrice必須
  CONSIGNMENT  // 委託品: costPrice=null
}

model Item {
  id             String    @id @default(cuid())
  sku            String    @unique  // SKU-00001 or CSG-00001
  itemType       ItemType  @default(PRODUCT)
  name           String              // アイテム名（必須）
  manufacturerId String?             // メーカーID
  categoryId     String?             // 品目ID
  specification  String?             // 仕様（自由テキスト）
  size           String?             // サイズ
  fabricColor    String?             // 張地/カラー（複数行テキスト）
  quantity       Int      @default(0)  // 個数
  unitId         String?             // 単位ID
  costPrice      Decimal?            // 原価単価（商品は必須、委託品はnull）
  listPrice      Decimal?            // 定価単価
  arrivalDate    String?             // 入荷年月（例: "2024年1月"）
  locationId     String?             // 場所ID
  designer       String?             // デザイナー
  notes          String?             // 備考
  isSold         Boolean  @default(false)  // 販売済みフラグ
  soldAt         DateTime?           // 販売済み日時
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  manufacturer Manufacturer? @relation(fields: [manufacturerId], references: [id], onDelete: SetNull)
  category     Category?     @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  unit         Unit?         @relation(fields: [unitId], references: [id], onDelete: SetNull)
  location     Location?     @relation(fields: [locationId], references: [id], onDelete: SetNull)
  images       ItemImage[]
  materials    ItemMaterial[]
  tags         ItemTag[]

  @@index([itemType])
  @@index([manufacturerId])
  @@index([categoryId])
  @@index([locationId])
  @@index([unitId])
  @@index([name])
  @@index([sku])
  @@index([isSold])
  @@map("items")
}
```

**フィールド詳細**
- 必須: `name`
- 条件付き必須: `costPrice`（itemType=PRODUCTの場合のみ必須）
- 自動採番: `sku`
  - PRODUCT: `SKU-00001`形式
  - CONSIGNMENT: `CSG-00001`形式
- 数量: `quantity`（0以上、デフォルト0）
- 金額: `costPrice`, `listPrice` - Decimal型（nullableあり）
- 日付: `arrivalDate` - 文字列（例: "2024年1月"）
- 参照: `manufacturerId`, `categoryId`, `locationId`, `unitId`（いずれも任意）
- 計算フィールド（クライアント側）: `totalCost = (costPrice || 0) * quantity`

### ItemType による違い

| 項目 | PRODUCT（商品） | CONSIGNMENT（委託品） |
|------|----------------|----------------------|
| SKU形式 | `SKU-NNNNN` | `CSG-NNNNN` |
| costPrice | 必須 | null |
| 原価合計計算 | 含まれる | 含まれない |

---

## Related Entities

### ItemImage
```prisma
model ItemImage {
  id     String @id @default(cuid())
  itemId String
  url    String
  order  Int    @default(0)

  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([itemId])
  @@map("item_images")
}
```

### ItemMaterial
```prisma
model ItemMaterial {
  id             String   @id @default(cuid())
  itemId         String
  materialTypeId String
  description    String?
  imageUrl       String?
  order          Int      @default(0)
  createdAt      DateTime @default(now())

  item         Item         @relation(fields: [itemId], references: [id], onDelete: Cascade)
  materialType MaterialType @relation(fields: [materialTypeId], references: [id], onDelete: Cascade)

  @@index([itemId])
  @@index([materialTypeId])
  @@map("item_materials")
}
```

### ItemTag（中間テーブル）
```prisma
model ItemTag {
  id        String   @id @default(cuid())
  itemId    String
  tagId     String
  createdAt DateTime @default(now())

  item Item @relation(fields: [itemId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@unique([itemId, tagId])
  @@index([itemId])
  @@index([tagId])
  @@map("item_tags")
}
```

---

## Master Data（マスタデータ）

### Manufacturer（メーカー）
```prisma
model Manufacturer {
  id    String @id @default(cuid())
  name  String @unique
  items Item[]

  @@map("manufacturers")
}
```

### Category（品目）
```prisma
model Category {
  id    String @id @default(cuid())
  name  String @unique
  items Item[]

  @@map("categories")
}
```

### Location（場所）
```prisma
model Location {
  id    String @id @default(cuid())
  name  String @unique
  items Item[]

  @@map("locations")
}
```

### Unit（単位）
```prisma
model Unit {
  id    String @id @default(cuid())
  name  String @unique
  items Item[]

  @@map("units")
}
```

**共通仕様**
- 各マスタは`Item`から参照される
- 削除時は参照をSetNull（ItemのXxxIdをnullに）
- APIは一覧で参照カウント（_count.items）を返す

---

## Tag（タグ）v3.0

### Tag
```prisma
model Tag {
  id        String    @id @default(cuid())
  name      String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  itemTags  ItemTag[]

  @@map("tags")
}
```

**タグ仕様**
- アイテムに複数タグを付与可能（多対多）
- フィルタリング: OR条件（指定タグのいずれかを持つアイテムを取得）
- 削除: タグ削除時はCascadeで中間テーブルも削除

---

## Material（素材）v3.0

### MaterialType（素材項目マスタ）
```prisma
model MaterialType {
  id            String         @id @default(cuid())
  name          String         @unique
  order         Int            @default(0)
  createdAt     DateTime       @default(now())
  itemMaterials ItemMaterial[]

  @@map("material_types")
}
```

**素材仕様**
- 1アイテムに複数素材を登録可能
- 素材ごとに説明テキストと画像1枚
- order で表示順を管理

---

## System（システム）

### ChangeLog（変更履歴）v3.0
```prisma
model ChangeLog {
  id         String   @id @default(cuid())
  entityType String   // "item" (v3.0), "product"/"consignment" (v2.x互換)
  entityId   String
  entityName String
  entitySku  String
  action     String   // "create" | "update" | "delete"
  changes    String?  // JSON
  userId     String
  userName   String
  itemType   String?  // "PRODUCT" | "CONSIGNMENT" (v3.0追加)
  createdAt  DateTime @default(now())

  @@index([entityType])
  @@index([createdAt])
  @@map("change_logs")
}
```

**変更履歴仕様**
- entityType: v3.0では'item'、v2.x互換で'product'/'consignment'も対応
- itemType: アイテムの種別を記録（v3.0追加）
- changes: 更新時は変更前後の差分をJSON形式で保存
- entityName, entitySku, userName: 削除後も履歴表示のため別途保存

### SystemSetting（システム設定）
```prisma
model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt

  @@map("system_settings")
}
```

**用途**
- `next_product_sku`: 次の商品SKU番号
- `next_consignment_sku`: 次の委託品SKU番号
- その他運用ルールの保存

### User（ユーザー）
```prisma
model User {
  id           String    @id @default(cuid())
  username     String    @unique
  passwordHash String
  role         String    @default("USER")  // "ADMIN" | "USER"
  createdAt    DateTime  @default(now())
  sessions     Session[]

  @@map("users")
}
```

### Session（セッション）
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}
```

---

## Indexes（インデックス）

### Item
- `sku` (unique)
- `itemType`
- `name`
- `manufacturerId`
- `categoryId`
- `locationId`
- `unitId`
- `isSold`

### ItemTag
- `itemId`
- `tagId`
- `[itemId, tagId]` (unique)

### Session
- `userId`
- `expiresAt`

### ChangeLog
- `entityType`
- `createdAt`

---

## SKU Auto Generation

### 商品SKU（itemType=PRODUCT）
- 形式: `SKU-NNNNN`（5桁ゼロ埋め）
- 例: `SKU-00001`, `SKU-00123`
- 採番: SystemSettingの`next_product_sku`を使用（トランザクション安全）

### 委託品SKU（itemType=CONSIGNMENT）
- 形式: `CSG-NNNNN`（5桁ゼロ埋め）
- 例: `CSG-00001`, `CSG-00042`
- 採番: SystemSettingの`next_consignment_sku`を使用（トランザクション安全）

---

## Master Data Seed（参考値）

### Unit（単位）
台, 個, 枚, 脚, 式, 本, 点, 箱, 冊, セット

### Location（場所）
SRバックヤード, 粟崎, リンテルノ展示, 不明・破棄, 貸出

---

## Legacy Models（v2.x互換）

以下のモデルはPrismaスキーマから削除済み（2026-02-06）。
DBテーブルはマイグレーション実行後にDROPされる。

- Product, ProductImage, ProductMaterial, ProductTag
- Consignment, ConsignmentImage, ConsignmentMaterial, ConsignmentTag

---

## Version History

| バージョン | 主な変更 |
|-----------|---------|
| v1.0 | 初期モデル（Product, Supplier, Category, Tag） |
| v2.0 | 命名変更（Supplier→Manufacturer等）、SKU自動採番、Unit追加 |
| v2.1 | Consignment, Material, ChangeLog, SystemSetting追加 |
| v2.2 | Tag機能追加（ProductTag, ConsignmentTag） |
| v2.3 | designerフィールド追加 |
| **v3.0** | **Product/Consignmentを Itemに統合、ItemImage/ItemMaterial/ItemTag追加** |
