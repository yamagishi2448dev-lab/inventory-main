import { z } from 'zod'

// タグ作成・更新用のバリデーションスキーマ
export const tagSchema = z.object({
  name: z
    .string()
    .min(1, 'タグ名は必須です')
    .max(50, 'タグ名は50文字以内で入力してください'),
})

// タグ作成用の型
export type TagInput = z.infer<typeof tagSchema>
