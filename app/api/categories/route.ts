import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { categorySchema } from '@/lib/validations/category'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'

// GET /api/categories - カテゴリ一覧取得
export async function GET() {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('カテゴリ一覧取得エラー:', error)
    return NextResponse.json(
      { error: 'カテゴリ一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST /api/categories - カテゴリ新規作成
export async function POST(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()

    // バリデーション
    const validatedData = categorySchema.parse(body)

    // カテゴリ名の重複チェック
    const existingCategory = await prisma.category.findUnique({
      where: { name: validatedData.name },
    })

    if (existingCategory) {
      return NextResponse.json(
        { error: 'このカテゴリ名は既に使用されています' },
        { status: 409 }
      )
    }

    // カテゴリ作成
    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
      },
    })

    return NextResponse.json(
      { success: true, category },
      { status: 201 }
    )
  } catch (error) {
    console.error('カテゴリ作成エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'カテゴリの作成に失敗しました' },
      { status: 500 }
    )
  }
}
