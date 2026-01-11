import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { changeOwnPasswordSchema } from '@/lib/validations/user'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { ZodError } from 'zod'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME } from '@/lib/constants'

/**
 * POST /api/auth/change-password
 * ログイン中のユーザーが自分のパスワードを変更
 * 現在のセッション以外の全セッションを削除
 */
export async function POST(request: NextRequest) {
  // 認証チェック（全ユーザー対象）
  const authResult = await authenticateRequest()
  if (!authResult.success) {
    return authResult.response
  }

  try {
    const body = await request.json()

    // バリデーション
    const validatedData = changeOwnPasswordSchema.parse(body)

    // ユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: authResult.user.id },
      select: {
        id: true,
        passwordHash: true,
      },
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

    // 現在のパスワードを検証
    const isValidPassword = await verifyPassword(
      validatedData.currentPassword,
      user.passwordHash
    )

    if (!isValidPassword) {
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        {
          status: 401,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    // 新しいパスワードのハッシュ化
    const newPasswordHash = await hashPassword(validatedData.newPassword)

    // 現在のセッショントークンを取得
    const cookieStore = await cookies()
    const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

    // 現在のセッションID を取得（削除対象から除外するため）
    let currentSessionId: string | null = null
    if (currentToken) {
      const crypto = await import('crypto')
      const tokenHash = crypto.createHash('sha256').update(currentToken).digest('hex')
      const currentSession = await prisma.session.findUnique({
        where: { tokenHash },
        select: { id: true },
      })
      currentSessionId = currentSession?.id || null
    }

    // トランザクションでパスワード更新と他セッション削除を実行
    await prisma.$transaction([
      // パスワード更新
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      }),
      // 現在のセッション以外を削除
      prisma.session.deleteMany({
        where: {
          userId: user.id,
          ...(currentSessionId && { id: { not: currentSessionId } }),
        },
      }),
    ])

    return NextResponse.json(
      { message: 'パスワードを変更しました' },
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

    console.error('パスワード変更エラー:', error)
    return NextResponse.json(
      { error: 'パスワードの変更に失敗しました' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  }
}
