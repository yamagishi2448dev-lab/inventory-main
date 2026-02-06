import { z } from 'zod'

// ===== v3.0 Item統合スキーマ =====

/** アイテム種別 */
export const itemTypeSchema = z.enum(['PRODUCT', 'CONSIGNMENT'])

/** 基本フィールドスキーマ（商品・委託品共通） */
const baseItemFields = {
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

  // サイズ（オプション）
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

  // デザイナー（オプション）
  designer: z
    .string()
    .max(200, 'デザイナーは200文字以内で入力してください')
    .optional()
    .nullable(),

  // 備考（オプション）
  notes: z
    .string()
    .max(2000, '備考は2000文字以内で入力してください')
    .optional()
    .nullable(),

  // 販売済みフラグ
  isSold: z
    .boolean()
    .optional()
    .default(false),

  // 販売済み日時
  soldAt: z
    .string()
    .datetime()
    .optional()
    .nullable(),

  // タグIDの配列
  tagIds: z
    .array(z.string().cuid('無効なタグIDです'))
    .optional()
    .default([]),

  // 画像の配列
  images: z
    .array(
      z.object({
        url: z.string().url('無効なURLです'),
        order: z.number().int().min(0),
      })
    )
    .optional()
    .default([]),
}

/** 商品（PRODUCT）作成用スキーマ - costPrice必須 */
export const productItemSchema = z.object({
  ...baseItemFields,
  itemType: z.literal('PRODUCT').default('PRODUCT'),
  // 原価単価（商品は必須）
  costPrice: z
    .string()
    .refine((val) => {
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    }, '原価単価は0以上の数値を入力してください'),
})

/** 委託品（CONSIGNMENT）作成用スキーマ - costPriceなし */
export const consignmentItemSchema = z.object({
  ...baseItemFields,
  itemType: z.literal('CONSIGNMENT').default('CONSIGNMENT'),
  // 原価単価（委託品はnull）
  costPrice: z.null().optional(),
})

/** アイテム作成用の統合スキーマ */
export const itemCreateSchema = z.discriminatedUnion('itemType', [
  productItemSchema,
  consignmentItemSchema,
])

/** アイテム更新用スキーマ（部分更新対応） */
export const itemUpdateSchema = z.object({
  ...baseItemFields,
  itemType: itemTypeSchema.optional(),
  // 原価単価（更新時は任意、商品の場合のみバリデーション）
  costPrice: z
    .string()
    .refine((val) => {
      if (!val) return true
      const num = parseFloat(val)
      return !isNaN(num) && num >= 0
    }, '原価単価は0以上の数値を入力してください')
    .optional()
    .nullable(),
}).partial()

/** 個数更新用スキーマ */
export const itemQuantityUpdateSchema = z.object({
  quantity: z
    .number()
    .int('個数は整数を入力してください')
    .min(0, '個数は0以上の値を入力してください'),
})

/** 一括削除用スキーマ */
export const itemBulkDeleteSchema = z.object({
  ids: z
    .array(z.string().cuid('無効なIDです'))
    .min(1, '削除対象を選択してください')
    .max(100, '一度に削除できるのは100件までです'),
})

/** 一括編集用スキーマ */
export const itemBulkEditSchema = z.object({
  ids: z
    .array(z.string().cuid('無効なIDです'))
    .min(1, '編集対象を選択してください')
    .max(100, '一度に編集できるのは100件までです'),
  updates: z.object({
    locationId: z.string().cuid('無効な場所IDです').optional().nullable(),
    manufacturerId: z.string().cuid('無効なメーカーIDです').optional().nullable(),
    categoryId: z.string().cuid('無効な品目IDです').optional().nullable(),
    tagIds: z.array(z.string().cuid('無効なタグIDです')).optional(),
    quantity: z.object({
      mode: z.enum(['set', 'adjust']),
      value: z.number().int('個数は整数を入力してください'),
    }).optional(),
  }),
})

// 型エクスポート
export type ItemType = z.infer<typeof itemTypeSchema>
export type ProductItemCreateInput = z.infer<typeof productItemSchema>
export type ConsignmentItemCreateInput = z.infer<typeof consignmentItemSchema>
export type ItemCreateInput = z.infer<typeof itemCreateSchema>
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>
export type ItemQuantityUpdateInput = z.infer<typeof itemQuantityUpdateSchema>
export type ItemBulkDeleteInput = z.infer<typeof itemBulkDeleteSchema>
export type ItemBulkEditInput = z.infer<typeof itemBulkEditSchema>

/**
 * アイテム作成時のバリデーション
 * itemTypeに応じて適切なスキーマを適用
 */
export function validateItemCreate(data: unknown) {
  // まず基本的な形を確認
  const baseCheck = z.object({ itemType: itemTypeSchema.optional() }).safeParse(data)

  if (!baseCheck.success) {
    return { success: false as const, error: baseCheck.error }
  }

  const itemType = baseCheck.data.itemType || 'PRODUCT'

  if (itemType === 'PRODUCT') {
    return productItemSchema.safeParse(data)
  } else {
    return consignmentItemSchema.safeParse(data)
  }
}

/**
 * アイテム更新時のバリデーション
 * 商品の場合、costPriceがnullに変更されないことを確認
 */
export function validateItemUpdate(data: unknown, currentItemType: 'PRODUCT' | 'CONSIGNMENT') {
  const result = itemUpdateSchema.safeParse(data)

  if (!result.success) {
    return result
  }

  // 商品の場合、costPriceがnullになる更新は拒否
  if (currentItemType === 'PRODUCT' && result.data.costPrice === null) {
    return {
      success: false as const,
      error: new z.ZodError([{
        code: 'custom',
        path: ['costPrice'],
        message: '商品の原価単価は必須です',
      }]),
    }
  }

  return result
}
