import { z } from 'zod'

/**
 * ユーザー作成時のバリデーションスキーマ
 */
export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, 'ユーザー名は3文字以上で入力してください')
    .max(50, 'ユーザー名は50文字以内で入力してください')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます'
    ),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(100, 'パスワードは100文字以内で入力してください'),
  role: z.enum(['ADMIN', 'USER'], {
    message: 'ロールはADMINまたはUSERのいずれかを選択してください',
  }),
})

/**
 * ユーザー更新時のバリデーションスキーマ
 */
export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'ユーザー名は3文字以上で入力してください')
    .max(50, 'ユーザー名は50文字以内で入力してください')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'ユーザー名は英数字、アンダースコア、ハイフンのみ使用できます'
    )
    .optional(),
  role: z
    .enum(['ADMIN', 'USER'], {
      message: 'ロールはADMINまたはUSERのいずれかを選択してください',
    })
    .optional(),
})

/**
 * パスワードリセット時のバリデーションスキーマ（管理者用）
 */
export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(100, 'パスワードは100文字以内で入力してください'),
})

/**
 * 自分のパスワード変更時のバリデーションスキーマ
 */
export const changeOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
    newPassword: z
      .string()
      .min(8, '新しいパスワードは8文字以上で入力してください')
      .max(100, 'パスワードは100文字以内で入力してください'),
    confirmPassword: z.string().min(1, 'パスワード確認を入力してください'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  })

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type ChangeOwnPasswordInput = z.infer<typeof changeOwnPasswordSchema>
