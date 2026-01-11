import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { resetPasswordSchema } from '@/lib/validations/user'
import { hashPassword } from '@/lib/auth/password'
import { ZodError } from 'zod'

/**
 * POST /api/users/[id]/reset-password
 * ユーザーのパスワードをリセット（管理者のみ）
 * 対象ユーザーの全セッションを削除し、強制ログアウトさせる
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 管理者認証チェック
  const authResult = await authenticateAdmin()
  if (!authResult.success) {
    return authResult.response
  }

  try {
    const { id } = await params
    const body = await request.json()

    // バリデーション
    const validatedData = resetPasswordSchema.parse(body)

    // ユーザーの存在確認
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    // パスワードのハッシュ化
    const passwordHash = await hashPassword(validatedData.newPassword)

    // トランザクションでパスワード更新とセッション削除を実行
    await prisma.$transaction([
      // パスワード更新
      prisma.user.update({
        where: { id },
        data: { passwordHash },
      }),
      // 対象ユーザーの全セッションを削除（強制ログアウト）
      prisma.session.deleteMany({
        where: { userId: id },
      }),
    ])

    return NextResponse.json(
      { message: 'パスワードをリセットしました。対象ユーザーは再ログインが必要です。' },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || '入力内容に誤りがあります' },
        {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    console.error('パスワードリセットエラー:', error)
    return NextResponse.json(
      { error: 'パスワードのリセットに失敗しました' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  }
}
