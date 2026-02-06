-- v3.0 Product/Consignment統合マイグレーション
-- 1. 新テーブル作成
-- 2. 既存データ移行
-- 3. マスタデータのリレーション更新（別途Prismaが処理）

-- ItemType enum作成
CREATE TYPE "ItemType" AS ENUM ('PRODUCT', 'CONSIGNMENT');

-- items テーブル作成
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "itemType" "ItemType" NOT NULL DEFAULT 'PRODUCT',
    "name" TEXT NOT NULL,
    "manufacturerId" TEXT,
    "categoryId" TEXT,
    "specification" TEXT,
    "size" TEXT,
    "fabricColor" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "unitId" TEXT,
    "costPrice" DECIMAL(65,30),
    "listPrice" DECIMAL(65,30),
    "arrivalDate" TEXT,
    "locationId" TEXT,
    "designer" TEXT,
    "notes" TEXT,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- item_images テーブル作成
CREATE TABLE "item_images" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "item_images_pkey" PRIMARY KEY ("id")
);

-- item_materials テーブル作成
CREATE TABLE "item_materials" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "materialTypeId" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_materials_pkey" PRIMARY KEY ("id")
);

-- item_tags テーブル作成
CREATE TABLE "item_tags" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_tags_pkey" PRIMARY KEY ("id")
);

-- インデックス作成
CREATE UNIQUE INDEX "items_sku_key" ON "items"("sku");
CREATE INDEX "items_itemType_idx" ON "items"("itemType");
CREATE INDEX "items_manufacturerId_idx" ON "items"("manufacturerId");
CREATE INDEX "items_categoryId_idx" ON "items"("categoryId");
CREATE INDEX "items_locationId_idx" ON "items"("locationId");
CREATE INDEX "items_unitId_idx" ON "items"("unitId");
CREATE INDEX "items_name_idx" ON "items"("name");
CREATE INDEX "items_sku_idx" ON "items"("sku");
CREATE INDEX "items_isSold_idx" ON "items"("isSold");

CREATE INDEX "item_images_itemId_idx" ON "item_images"("itemId");
CREATE INDEX "item_materials_itemId_idx" ON "item_materials"("itemId");
CREATE INDEX "item_materials_materialTypeId_idx" ON "item_materials"("materialTypeId");
CREATE INDEX "item_tags_itemId_idx" ON "item_tags"("itemId");
CREATE INDEX "item_tags_tagId_idx" ON "item_tags"("tagId");
CREATE UNIQUE INDEX "item_tags_itemId_tagId_key" ON "item_tags"("itemId", "tagId");

-- 外部キー制約
ALTER TABLE "items" ADD CONSTRAINT "items_manufacturerId_fkey"
    FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "items" ADD CONSTRAINT "items_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "items" ADD CONSTRAINT "items_unitId_fkey"
    FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "items" ADD CONSTRAINT "items_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "item_images" ADD CONSTRAINT "item_images_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "item_materials" ADD CONSTRAINT "item_materials_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_materials" ADD CONSTRAINT "item_materials_materialTypeId_fkey"
    FOREIGN KEY ("materialTypeId") REFERENCES "material_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_tags" ADD CONSTRAINT "item_tags_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- change_logsにitemTypeカラム追加
ALTER TABLE "change_logs" ADD COLUMN "itemType" TEXT;

-- ============================================
-- データ移行
-- ============================================

-- 商品データをitemsに移行
INSERT INTO "items" (
    "id", "sku", "itemType", "name", "manufacturerId", "categoryId",
    "specification", "size", "fabricColor", "quantity", "unitId",
    "costPrice", "listPrice", "arrivalDate", "locationId", "designer",
    "notes", "isSold", "soldAt", "createdAt", "updatedAt"
)
SELECT
    "id", "sku", 'PRODUCT'::"ItemType", "name", "manufacturerId", "categoryId",
    "specification", "size", "fabricColor", "quantity", "unitId",
    "costPrice", "listPrice", "arrivalDate", "locationId", "designer",
    "notes", "isSold", "soldAt", "createdAt", "updatedAt"
FROM "products";

-- 委託品データをitemsに移行（costPriceはnull）
INSERT INTO "items" (
    "id", "sku", "itemType", "name", "manufacturerId", "categoryId",
    "specification", "size", "fabricColor", "quantity", "unitId",
    "costPrice", "listPrice", "arrivalDate", "locationId", "designer",
    "notes", "isSold", "soldAt", "createdAt", "updatedAt"
)
SELECT
    "id", "sku", 'CONSIGNMENT'::"ItemType", "name", "manufacturerId", "categoryId",
    "specification", "size", "fabricColor", "quantity", "unitId",
    NULL, "listPrice", "arrivalDate", "locationId", "designer",
    "notes", "isSold", "soldAt", "createdAt", "updatedAt"
FROM "consignments";

-- 商品画像をitem_imagesに移行
INSERT INTO "item_images" ("id", "itemId", "url", "order")
SELECT "id", "productId", "url", "order"
FROM "product_images";

-- 委託品画像をitem_imagesに移行
INSERT INTO "item_images" ("id", "itemId", "url", "order")
SELECT "id", "consignmentId", "url", "order"
FROM "consignment_images";

-- 商品素材をitem_materialsに移行
INSERT INTO "item_materials" ("id", "itemId", "materialTypeId", "description", "imageUrl", "order", "createdAt")
SELECT "id", "productId", "materialTypeId", "description", "imageUrl", "order", "createdAt"
FROM "product_materials";

-- 委託品素材をitem_materialsに移行
INSERT INTO "item_materials" ("id", "itemId", "materialTypeId", "description", "imageUrl", "order", "createdAt")
SELECT "id", "consignmentId", "materialTypeId", "description", "imageUrl", "order", "createdAt"
FROM "consignment_materials";

-- 商品タグをitem_tagsに移行
INSERT INTO "item_tags" ("id", "itemId", "tagId", "createdAt")
SELECT "id", "productId", "tagId", "createdAt"
FROM "product_tags";

-- 委託品タグをitem_tagsに移行
INSERT INTO "item_tags" ("id", "itemId", "tagId", "createdAt")
SELECT "id", "consignmentId", "tagId", "createdAt"
FROM "consignment_tags";

-- 変更履歴のentityTypeとitemTypeを更新
UPDATE "change_logs" SET "itemType" = 'PRODUCT' WHERE "entityType" = 'product';
UPDATE "change_logs" SET "itemType" = 'CONSIGNMENT' WHERE "entityType" = 'consignment';
UPDATE "change_logs" SET "entityType" = 'item' WHERE "entityType" IN ('product', 'consignment');
