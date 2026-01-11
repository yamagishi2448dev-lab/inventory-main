import { NextRequest, NextResponse } from 'next/server'
import { authenticateAdmin } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db/prisma'
import { createUserSchema } from '@/lib/validations/user'
import { hashPassword } from '@/lib/auth/password'
import { ZodError } from 'zod'

/**
 * GET /api/users
 * 全ユーザー一覧を取得（管理者のみ）
 */
export async function GET() {
  // 管理者認証チェック
  const authResult = await authenticateAdmin()
  if (!authResult.success) {
    return authResult.response
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(
      { users },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  } catch (error) {
    console.error('ユーザー一覧取得エラー:', error)
    return NextResponse.json(
      { error: 'ユーザー一覧の取得に失敗しました' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  }
}

/**
 * POST /api/users
 * 新規ユーザーを作成（管理者のみ）
 */
export async function POST(request: NextRequest) {
  // 管理者認証チェック
  const authResult = await authenticateAdmin()
  if (!authResult.success) {
    return authResult.response
  }

  try {
    const body = await request.json()

    // バリデーション
    const validatedData = createUserSchema.parse(body)

    // ユーザー名の重複チェック
    const existingUser = await prisma.user.findUnique({
      where: { username: validatedData.username },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'このユーザー名は既に使用されています' },
        {
          status: 409,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }
      )
    }

    // パスワードのハッシュ化
    const passwordHash = await hashPassword(validatedData.password)

    // ユーザー作成
    const newUser = await prisma.user.create({
      data: {
        username: validatedData.username,
        passwordHash,
        role: validatedData.role,
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      { user: newUser },
      {
        status: 201,
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

    console.error('ユーザー作成エラー:', error)
    return NextResponse.json(
      { error: 'ユーザーの作成に失敗しました' },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    )
  }
}
