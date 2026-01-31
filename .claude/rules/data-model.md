# Data Model (v2.3)

## Naming History
- v1 → v2.0: Supplier → Manufacturer（メーカー）、Category → 品目（用途変更）、Tag → Location（場所）
- v2.0: Unit（単位）追加
- v2.1: Consignment（委託品）、Material（素材）、ChangeLog（変更履歴）、SystemSetting追加
- v2.2: Tag機能追加（ProductTag、ConsignmentTag）
- v2.3: designerフィールド追加

## Entity Overview

| モデル | 説明 | 主なフィールド |
|--------|------|----------------|
| Product | 商品 | sku, name, costPrice, quantity, images[], materials[], tags[] |
| Consignment | 委託品 | sku, name, costPrice(=0), quantity, images[], materials[], tags[] |
| Manufacturer | メーカー | name |
| Category | 品目 | name |
| Location | 場所 | name |
| Unit | 単位 | name |
| Tag | タグ | name |
| MaterialType | 素材項目マスタ | name, order |
| ProductMaterial | 商品素材 | description, imageUrl, order |
| ConsignmentMaterial | 委託品素材 | description, imageUrl, order |
| ProductImage | 商品画像 | url, order |
| ConsignmentImage | 委託品画像 | url, order |
| ChangeLog | 変更履歴 | entityType, action, changes(JSON) |
| SystemSetting | システム設定 | key, value |
| User | ユーザー | username, passwordHash, role |
| Session | セッション | tokenHash, expiresAt |

---

## Core Entities

### Product（商品）v2.3
```prisma
model Product {
  id             String   @id @default(cuid())
  sku            String   @unique  // 自動採番: SKU-00001形式
  name           String              // 商品名（必須）
  manufacturerId String?             // メーカーID
  categoryId     String?             // 品目ID
  specification  String?             // 仕様（自由テキスト）
  size           String?             // サイズ
  fabricColor    String?             // 張地/カラー（複数行テキスト）
  quantity       Int      @default(0)  // 個数（旧stock）
  unitId         String?             // 単位ID
  costPrice      Decimal             // 原価単価（必須）
  listPrice      Decimal?            // 定価単価
  arrivalDate    String?             // 入荷年月（例: "2024年1月"）
  locationId     String?             // 場所ID
  designer       String?             // デザイナー（v2.3追加）
  notes          String?             // 備考
  isSold         Boolean  @default(false)  // 販売済みフラグ
  soldAt         DateTime?           // 販売済み日時
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  manufacturer Manufacturer?   @relation(...)
  category     Category?       @relation(...)
  unit         Unit?           @relation(...)
  location     Location?       @relation(...)
  images       ProductImage[]
  materials    ProductMaterial[]
  tags         ProductTag[]
}
```

**フィールド詳細**
- 必須: `name`, `costPrice`
- 自動採番: `sku`（`SKU-00001`形式、編集不可）
- 数量: `quantity`（0以上、デフォルト0）
- 金額: `costPrice`, `listPrice` - Decimal型
- 日付: `arrivalDate` - 文字列（例: "2024年1月"）
- 参照: `manufacturerId`, `categoryId`, `locationId`, `unitId`（いずれも任意）
- 計算フィールド（クライアント側）: `totalCost = costPrice * quantity`

### Consignment（委託品）v2.3
```prisma
model Consignment {
  // Productと同等の構造
  // costPrice は常に 0
  // sku は CSG-00001 形式で自動採番
}
```

**Productとの差異**
- SKU形式: `CSG-NNNNN`（5桁ゼロ埋め）
- costPrice: 常に0（委託品のため）
- その他フィールド: Productと同一

---

## Master Data（マスタデータ）

### Manufacturer（メーカー）
```prisma
model Manufacturer {
  id           String        @id @default(cuid())
  name         String        @unique
  products     Product[]
  consignments Consignment[]
}
```

### Category（品目）
```prisma
model Category {
  id           String        @id @default(cuid())
  name         String        @unique
  products     Product[]
  consignments Consignment[]
}
```

### Location（場所）
```prisma
model Location {
  id           String        @id @default(cuid())
  name         String        @unique
  products     Product[]
  consignments Consignment[]
}
```

### Unit（単位）
```prisma
model Unit {
  id           String        @id @default(cuid())
  name         String        @unique
  products     Product[]
  consignments Consignment[]
}
```

**共通仕様**
- 各マスタは商品・委託品の両方から参照される
- 削除時は参照をSetNull（商品・委託品のXxxIdをnullに）
- APIは一覧で参照カウント（_count.products, _count.consignments）を返す

---

## Tag（タグ）v2.2

### Tag
```prisma
model Tag {
  id           String           @id @default(cuid())
  name         String           @unique
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  products     ProductTag[]
  consignments ConsignmentTag[]
}
```

### ProductTag（中間テーブル）
```prisma
model ProductTag {
  id        String   @id @default(cuid())
  productId String
  tagId     String
  createdAt DateTime @default(now())

  @@unique([productId, tagId])  // 重複防止
}
```

### ConsignmentTag（中間テーブル）
```prisma
model ConsignmentTag {
  id            String   @id @default(cuid())
  consignmentId String
  tagId         String
  createdAt     DateTime @default(now())

  @@unique([consignmentId, tagId])  // 重複防止
}
```

**タグ仕様**
- 商品・委託品に複数タグを付与可能（多対多）
- フィルタリング: OR条件（指定タグのいずれかを持つ商品を取得）
- 削除: タグ削除時はCascadeで中間テーブルも削除

---

## Material（素材）v2.1

### MaterialType（素材項目マスタ）
```prisma
model MaterialType {
  id        String   @id @default(cuid())
  name      String   @unique  // 張地、木部、脚部など
  order     Int      @default(0)  // 表示順
  createdAt DateTime @default(now())

  materials            ProductMaterial[]
  consignmentMaterials ConsignmentMaterial[]
}
```

### ProductMaterial（商品素材）
```prisma
model ProductMaterial {
  id             String   @id @default(cuid())
  productId      String
  materialTypeId String
  description    String?  // 説明（自由記述）
  imageUrl       String?  // 画像URL（1枚）
  order          Int      @default(0)  // 表示順
  createdAt      DateTime @default(now())
}
```

### ConsignmentMaterial（委託品素材）
```prisma
model ConsignmentMaterial {
  // ProductMaterialと同等構造
  // consignmentId を参照
}
```

**素材仕様**
- 1商品/委託品に複数素材を登録可能
- 素材ごとに説明テキストと画像1枚
- order で表示順を管理

---

## Image（画像）

### ProductImage
```prisma
model ProductImage {
  id        String  @id @default(cuid())
  productId String
  url       String
  order     Int     @default(0)

  product Product @relation(..., onDelete: Cascade)
}
```

### ConsignmentImage
```prisma
model ConsignmentImage {
  id            String @id @default(cuid())
  consignmentId String
  url           String
  order         Int    @default(0)

  consignment Consignment @relation(..., onDelete: Cascade)
}
```

**画像仕様**
- 最大5枚/商品（委託品も同様）
- order で表示順を管理
- 商品/委託品削除時はCascadeで画像も削除

---

## System（システム）

### ChangeLog（変更履歴）v2.1
```prisma
model ChangeLog {
  id         String   @id @default(cuid())
  entityType String   // "product" | "consignment"
  entityId   String   // 商品ID または 委託品ID
  entityName String   // 商品名（削除後も表示するため保存）
  entitySku  String   // SKU（削除後も表示するため保存）
  action     String   // "create" | "update" | "delete"
  changes    String?  // 変更内容の詳細（JSON形式）
  userId     String
  userName   String   // ユーザー名（削除後も表示するため保存）
  createdAt  DateTime @default(now())
}
```

**変更履歴仕様**
- 商品・委託品の作成/更新/削除を記録
- changes: 更新時は変更前後の差分をJSON形式で保存
- entityName, entitySku, userName: 削除後も履歴表示のため別途保存

### SystemSetting（システム設定）v2.1
```prisma
model SystemSetting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt
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
}
```

### Session（セッション）
```prisma
model Session {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique  // SHA256ハッシュ
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

---

## Indexes（インデックス）

### Product / Consignment
- `sku` (unique)
- `name`
- `manufacturerId`
- `categoryId`
- `locationId`
- `unitId`
- `isSold`

### Session
- `userId`
- `expiresAt`

### ChangeLog
- `entityType`
- `createdAt`

### ProductTag / ConsignmentTag
- `productId` / `consignmentId`
- `tagId`

---

## SKU Auto Generation

### 商品SKU
- 形式: `SKU-NNNNN`（5桁ゼロ埋め）
- 例: `SKU-00001`, `SKU-00123`
- 採番: SystemSettingの`next_product_sku`を使用（トランザクション安全）

### 委託品SKU
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

## Version History

| バージョン | 主な変更 |
|-----------|---------|
| v1.0 | 初期モデル（Product, Supplier, Category, Tag） |
| v2.0 | 命名変更（Supplier→Manufacturer等）、SKU自動採番、Unit追加 |
| v2.1 | Consignment, Material, ChangeLog, SystemSetting追加 |
| v2.2 | Tag機能追加（ProductTag, ConsignmentTag） |
| v2.3 | designerフィールド追加 |
