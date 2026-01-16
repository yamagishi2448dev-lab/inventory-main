/**
 * 共通型定義 v2.1
 * アプリケーション全体で使用される型を一元管理
 */

import { Prisma } from '@prisma/client'

// ==========================================
// 基本エンティティ型 (v2.1)
// ==========================================

/** 名前付きマスタの共通型 */
export interface NamedEntity {
    id: string
    name: string
}

/** 品目（カテゴリ）の基本型 */
export interface Category extends NamedEntity {}

/** メーカー（旧Supplier）の基本型 v2.0 */
export interface Manufacturer extends NamedEntity {}

/** 場所（旧Tag）の基本型 v2.0 */
export interface Location extends NamedEntity {}

/** 単位の基本型 v2.0 (新規) */
export interface Unit extends NamedEntity {}

/** タグの基本型 v2.2 (新規) */
export interface TagV2 extends NamedEntity {
    createdAt?: Date | string
    updatedAt?: Date | string
}

/** 商品タグ中間型 v2.2 */
export interface ProductTagRelation {
    id: string
    productId: string
    tagId: string
    tag?: TagV2
}

/** 委託品タグ中間型 v2.2 */
export interface ConsignmentTagRelation {
    id: string
    consignmentId: string
    tagId: string
    tag?: TagV2
}

/** 商品数を含むマスタデータ */
export interface NamedEntityWithCount extends NamedEntity {
    _count?: { products: number; consignments?: number }
}

/** 商品画像の型 */
export interface ProductImage {
    id: string
    url: string
    order: number
}

/** 商品の基本型 v2.1 */
export interface Product {
    id: string
    sku: string
    name: string
    manufacturerId?: string | null
    categoryId?: string | null
    specification?: string | null
    size?: string | null  // v2.1追加
    fabricColor?: string | null
    quantity: number
    unitId?: string | null
    costPrice: string | Prisma.Decimal
    listPrice?: string | Prisma.Decimal | null
    arrivalDate?: string | null
    locationId?: string | null
    notes?: string | null
    isSold?: boolean  // v2.1追加
    soldAt?: Date | string | null  // v2.1追加
    createdAt?: Date | string
    updatedAt?: Date | string
}

/** 素材項目マスタ型 v2.1 */
export interface MaterialType extends NamedEntity {
    order: number
}

/** 商品素材型 v2.1 */
export interface ProductMaterial {
    id: string
    productId: string
    materialTypeId: string
    materialType?: MaterialType
    description?: string | null
    imageUrl?: string | null
    order: number
}

/** 商品詳細型（リレーション含む）v2.2 */
export interface ProductWithRelations extends Product {
    manufacturer: Pick<Manufacturer, 'id' | 'name'> | null
    category: Pick<Category, 'id' | 'name'> | null
    location: Pick<Location, 'id' | 'name'> | null
    unit: Pick<Unit, 'id' | 'name'> | null
    images?: ProductImage[]
    materials?: ProductMaterial[]  // v2.1追加
    tags?: ProductTagRelation[]    // v2.2追加
    totalCost?: string
}

// ==========================================
// 旧型定義（後方互換性のため維持）
// ==========================================

/** @deprecated v1.0 - Manufacturerを使用してください */
export interface Supplier {
    id: string
    name: string
    contactName?: string | null
    email?: string | null
    phone?: string | null
}

/** @deprecated v1.0 - Locationを使用してください */
export interface Tag {
    id: string
    name: string
}

// ==========================================
// API レスポンス型
// ==========================================

/** ページネーション情報 */
export interface PaginationData {
    total: number
    page: number
    limit: number
    totalPages: number
}

/** 商品一覧APIレスポンス */
export interface ProductListResponse {
    products: ProductWithRelations[]
    pagination: PaginationData
}

/** 品目一覧APIレスポンス */
export interface CategoryListResponse {
    categories: NamedEntityWithCount[]
}

/** メーカー一覧APIレスポンス v2.0 */
export interface ManufacturerListResponse {
    manufacturers: NamedEntityWithCount[]
}

/** 場所一覧APIレスポンス v2.0 */
export interface LocationListResponse {
    locations: NamedEntityWithCount[]
}

/** 単位一覧APIレスポンス v2.0 */
export interface UnitListResponse {
    units: NamedEntityWithCount[]
}

/** タグ一覧APIレスポンス v2.2 */
export interface TagV2ListResponse {
    tags: (TagV2 & { _count?: { products: number; consignments: number } })[]
}

/** @deprecated v1.0 */
export interface TagListResponse {
    tags: (Tag & { _count?: { products: number } })[]
}

/** @deprecated v1.0 */
export interface SupplierListResponse {
    suppliers: (Supplier & { _count?: { products: number } })[]
}

/** API エラーレスポンス */
export interface ApiErrorResponse {
    error: string
    details?: unknown
}

/** API 成功レスポンス */
export interface ApiSuccessResponse<T = unknown> {
    success: true
    data?: T
}

// ==========================================
// フィルター/クエリ関連の型 v2.0
// ==========================================

/** 商品ソートフィールド */
export type ProductSortField =
    | 'manufacturer'
    | 'category'
    | 'name'
    | 'specification'
    | 'quantity'
    | 'costPrice'
    | 'location'
    | 'createdAt'

/** 商品ソート順 */
export type ProductSortOrder = 'asc' | 'desc'

/** 商品検索フィルター v2.2 */
export interface ProductFilters {
    search?: string
    categoryId?: string
    manufacturerId?: string
    locationId?: string
    arrivalDate?: string
    tagIds?: string[]      // v2.2追加: タグIDの配列（OR条件）
    includeSold?: boolean  // v2.1追加: 販売済みを含むかどうか（デフォルト: false）
    page?: number
    limit?: number
}

/** @deprecated v1.0 フィルター - ProductFiltersを使用してください */
export interface ProductFiltersV1 {
    search?: string
    categoryId?: string
    tagId?: string
    supplierId?: string
    stockFilter?: 'inStock' | 'outOfStock'
    page?: number
    limit?: number
}

/** 商品検索のWhere句型 v2.0 */
export interface ProductWhereInput {
    OR?: Array<{
        name?: { contains: string }
        sku?: { contains: string }
        specification?: { contains: string }
    }>
    categoryId?: string
    manufacturerId?: string
    locationId?: string
    arrivalDate?: { contains: string }
}

// ==========================================
// 一括操作関連の型
// ==========================================

/** 一括削除リクエスト */
export interface BulkDeleteRequest {
    productIds: string[]
}

/** 一括削除レスポンス */
export interface BulkDeleteResponse {
    success: true
    deletedCount: number
    message: string
}

/** 個数編集モード */
export type QuantityMode = 'set' | 'increment'

/** 一括編集リクエスト */
export interface BulkEditRequest {
    productIds: string[]
    updates: {
        locationId?: string
        manufacturerId?: string
        categoryId?: string
        quantity?: {
            mode: QuantityMode
            value: number
        }
    }
}

/** 一括編集レスポンス */
export interface BulkEditResponse {
    success: true
    updatedCount: number
    message: string
}

// ==========================================
// v2.1 新規型定義
// ==========================================

/** 変更履歴アクション */
export type ChangeLogAction = 'create' | 'update' | 'delete'

/** 変更履歴エンティティタイプ */
export type ChangeLogEntityType = 'product' | 'consignment'

/** 変更履歴の変更内容 */
export interface ChangeLogField {
    field: string
    label: string
    from?: string
    to?: string
}

/** 変更履歴型 v2.1 */
export interface ChangeLog {
    id: string
    entityType: ChangeLogEntityType
    entityId: string
    entityName: string
    entitySku: string
    action: ChangeLogAction
    changes?: string | null
    userId: string
    userName: string
    createdAt: Date | string
}

/** 委託品の基本型 v2.1 */
export interface Consignment {
    id: string
    sku: string
    name: string
    manufacturerId?: string | null
    categoryId?: string | null
    specification?: string | null
    size?: string | null
    fabricColor?: string | null
    quantity: number
    unitId?: string | null
    costPrice: string | Prisma.Decimal
    listPrice?: string | Prisma.Decimal | null
    arrivalDate?: string | null
    locationId?: string | null
    notes?: string | null
    isSold?: boolean
    soldAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
}

/** 委託品画像型 v2.1 */
export interface ConsignmentImage {
    id: string
    url: string
    order: number
}

/** 委託品素材型 v2.1 */
export interface ConsignmentMaterial {
    id: string
    consignmentId: string
    materialTypeId: string
    materialType?: MaterialType
    description?: string | null
    imageUrl?: string | null
    order: number
}

/** 委託品詳細型（リレーション含む）v2.2 */
export interface ConsignmentWithRelations extends Consignment {
    manufacturer: Pick<Manufacturer, 'id' | 'name'> | null
    category: Pick<Category, 'id' | 'name'> | null
    location: Pick<Location, 'id' | 'name'> | null
    unit: Pick<Unit, 'id' | 'name'> | null
    images?: ConsignmentImage[]
    materials?: ConsignmentMaterial[]
    tags?: ConsignmentTagRelation[]  // v2.2追加
    totalCost?: string
}

/** システム設定型 v2.1 */
export interface SystemSetting {
    id: string
    key: string
    value: string
    updatedAt: Date | string
}

/** 委託品ソートフィールド v2.1 */
export type ConsignmentSortField =
    | 'manufacturer'
    | 'category'
    | 'name'
    | 'specification'
    | 'quantity'
    | 'listPrice'
    | 'location'
    | 'createdAt'

/** 委託品ソート順 v2.1 */
export type ConsignmentSortOrder = 'asc' | 'desc'

/** 委託品検索フィルター v2.2 */
export interface ConsignmentFilters {
    search?: string
    categoryId?: string
    manufacturerId?: string
    locationId?: string
    arrivalDate?: string
    tagIds?: string[]      // v2.2追加: タグIDの配列（OR条件）
    includeSold?: boolean
    page?: number
    limit?: number
}

/** 委託品一覧APIレスポンス v2.1 */
export interface ConsignmentListResponse {
    consignments: ConsignmentWithRelations[]
    pagination: PaginationData
}
