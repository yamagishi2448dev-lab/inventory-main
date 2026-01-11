import { z } from 'zod'

// 仕入先作成・更新用のバリデーションスキーマ
export const supplierSchema = z.object({
  name: z
    .string()
    .min(1, '仕入先名は必須です')
    .max(200, '仕入先名は200文字以内で入力してください'),

  contactName: z
    .string()
    .max(100, '担当者名は100文字以内で入力してください')
    .optional()
    .nullable(),

  email: z
    .string()
    .email('有効なメールアドレスを入力してください')
    .optional()
    .or(z.literal(''))
    .nullable(),

  phone: z
    .string()
    .max(20, '電話番号は20文字以内で入力してください')
    .optional()
    .nullable(),
})

// 仕入先作成用の型
export type SupplierInput = z.infer<typeof supplierSchema>
