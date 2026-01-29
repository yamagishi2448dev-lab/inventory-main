import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { tagSchema } from '@/lib/validations/tag'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'

// GET /api/tags - タグ一覧取得
export async function GET() {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { products: true, consignments: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ tags })
  } catch (error) {
    console.error('タグ一覧取得エラー:', error)
    return NextResponse.json(
      { error: 'タグ一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST /api/tags - タグ新規作成
export async function POST(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()

    // バリデーション
    const validatedData = tagSchema.parse(body)

    // タグ名の重複チェック
    const existingTag = await prisma.tag.findUnique({
      where: { name: validatedData.name },
    })

    if (existingTag) {
      return NextResponse.json(
        { error: 'このタグ名は既に使用されています' },
        { status: 409 }
      )
    }

    // タグ作成
    const tag = await prisma.tag.create({
      data: {
        name: validatedData.name,
      },
    })

    return NextResponse.json(
      { success: true, tag },
      { status: 201 }
    )
  } catch (error) {
    console.error('タグ作成エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'タグの作成に失敗しました' },
      { status: 500 }
    )
  }
}
