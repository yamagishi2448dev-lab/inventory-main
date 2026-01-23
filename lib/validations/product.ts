import { z } from 'zod'

// ===== 旧スキーマ (v1.0 - 後方互換性のため維持) =====

// 商品作成・更新用のバリデーションスキーマ
export const productSchema = z.object({
  name: z
    .string()
    .min(1, '商品名は必須です')
    .max(200, '商品名は200文字以内で入力してください'),

  sku: z
    .string()
    .min(1, 'SKUは必須です')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'SKUは英数字、ハイフン、アンダースコアのみ使用できます'),

  price: z
    .string()
    .refine((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    }, '価格は0以上の数値を入力してください'),

  stock: z
    .number()
    .int('在庫数は整数を入力してください')
    .min(0, '在庫数は0以上の値を入力してください')
    .default(0),

  description: z
    .string()
    .max(2000, '説明は2000文字以内で入力してください')
    .optional()
    .nullable(),

  categoryId: z
    .string()
    .cuid('無効なカテゴリIDです')
    .optional()
    .nullable(),

  supplierId: z
    .string()
    .cuid('無効な仕入先IDです')
    .optional()
    .nullable(),

  tagIds: z
    .array(z.string().cuid('無効なタグIDです'))
    .optional()
    .default([]),
})

// 商品作成用の型
export type ProductCreateInput = z.infer<typeof productSchema>

// 商品更新用のスキーマ（部分更新対応）
export const productUpdateSchema = productSchema.partial()

// 在庫数更新用のスキーマ
export const stockUpdateSchema = z.object({
  stock: z
    .number()
    .int('在庫数は整数を入力してください')
    .min(0, '在庫数は0以上の値を入力してください'),
})

// 在庫数更新用の型
export type StockUpdateInput = z.infer<typeof stockUpdateSchema>

// ===== v2.1 スキーマ =====

// 商品作成・更新用のバリデーションスキーマ（v2.1）
export const productSchemaV2 = z.object({
  // 商品名（必須）
  name: z
    .string()
    .min(1, '商品名は必須です')
    .max(200, '商品名は200文字以内で入力してください'),

  // メーカーID（オプション）
  manufacturerId: z
    .string()
    .cuid('無効なメーカーIDです')
    .optional()
    .nullable(),

  // 品目ID（オプション）
  categoryId: z
    .string()
    .cuid('無効な品目IDです')
    .optional()
    .nullable(),

  // 仕様（オプション）
  specification: z
    .string()
    .max(2000, '仕様は2000文字以内で入力してください')
    .optional()
    .nullable(),

  // サイズ（オプション、v2.1追加）
  size: z
    .string()
    .max(200, 'サイズは200文字以内で入力してください')
    .optional()
    .nullable(),

  // 張地/カラー（オプション）
  fabricColor: z
    .string()
    .max(2000, '張地/カラーは2000文字以内で入力してください')
    .optional()
    .nullable(),

  // 個数（オプション、デフォルト0）
  quantity: z
    .coerce.number()
    .int('個数は整数を入力してください')
    .min(0, '個数は0以上の値を入力してください')
    .default(0),

  // 単位ID（オプション）
  unitId: z
    .string()
    .cuid('無効な単位IDです')
    .optional()
    .nullable(),

  // 原価単価（必須）
  costPrice: z
    .string()
    .refine((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    }, '原価単価は0以上の数値を入力してください'),

  // 定価単価（オプション）
  listPrice: z
    .string()
    .refine((val) => {
      if (!val) return true
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    }, '定価単価は0以上の数値を入力してください')
    .optional()
    .nullable(),

  // 入荷年月（オプション）
  arrivalDate: z
    .string()
    .max(50, '入荷年月は50文字以内で入力してください')
    .optional()
    .nullable(),

  // 場所ID（オプション）
  locationId: z
    .string()
    .cuid('無効な場所IDです')
    .optional()
    .nullable(),

  // 備考（オプション）
  notes: z
    .string()
    .max(2000, '備考は2000文字以内で入力してください')
    .optional()
    .nullable(),

  // 販売済みフラグ（v2.1追加）
  isSold: z
    .boolean()
    .optional()
    .default(false),

  // 販売済み日時（v2.1追加）
  soldAt: z
    .string()
    .datetime()
    .optional()
    .nullable(),

  // タグIDの配列（v2.2追加）
  tagIds: z
    .array(z.string().cuid('無効なタグIDです'))
    .optional()
    .default([]),

  // 画像の配列（v2.2追加）
  images: z
    .array(
      z.object({
        url: z.string().url('無効なURLです'),
        order: z.number().int().min(0),
      })
    )
    .optional()
    .default([]),
})

// 商品作成用の型（v2.0）
export type ProductCreateInputV2 = z.infer<typeof productSchemaV2>

// 商品更新用のスキーマ（v2.0、部分更新対応）
export const productUpdateSchemaV2 = productSchemaV2.partial()

// 個数更新用のスキーマ（v2.0）
export const quantityUpdateSchema = z.object({
  quantity: z
    .number()
    .int('個数は整数を入力してください')
    .min(0, '個数は0以上の値を入力してください'),
})

// 個数更新用の型（v2.0）
export type QuantityUpdateInput = z.infer<typeof quantityUpdateSchema>
