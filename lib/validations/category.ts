import { z } from 'zod'

// カテゴリ作成・更新用のバリデーションスキーマ
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, 'カテゴリ名は必須です')
    .max(100, 'カテゴリ名は100文字以内で入力してください'),

  description: z
    .string()
    .max(500, '説明は500文字以内で入力してください')
    .optional()
    .nullable(),
})

// カテゴリ作成用の型
export type CategoryInput = z.infer<typeof categorySchema>
