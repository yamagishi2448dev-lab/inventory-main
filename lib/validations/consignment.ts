import { z } from 'zod'

// 委託品作成用のバリデーションスキーマ（v2.1）
export const consignmentSchema = z.object({
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

  // デザイナー（オプション、v2.3追加）
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

  // タグIDの配列（v2.2追加）
  tagIds: z
    .array(z.string().cuid('無効なタグIDです'))
    .optional()
    .default([]),
})

// 委託品作成用の型
export type ConsignmentCreateInput = z.infer<typeof consignmentSchema>

// 委託品更新用のスキーマ（部分更新対応）
export const consignmentUpdateSchema = consignmentSchema.partial()

// 委託品更新用の型
export type ConsignmentUpdateInput = z.infer<typeof consignmentUpdateSchema>
