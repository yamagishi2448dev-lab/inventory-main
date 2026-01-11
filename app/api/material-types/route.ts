import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { z } from 'zod'

// バリデーションスキーマ
const materialTypeSchema = z.object({
  name: z
    .string()
    .min(1, '素材項目名は必須です')
    .max(50, '素材項目名は50文字以内で入力してください'),
  order: z.number().int().min(0).optional().default(0),
})

// GET /api/material-types - 素材項目一覧取得
export async function GET() {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const materialTypes = await prisma.materialType.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { materials: true },
        },
      },
    })

    return NextResponse.json(
      { materialTypes },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Material types fetch error:', error)
    return NextResponse.json(
      { error: '素材項目一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST /api/material-types - 素材項目作成
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()
    const validatedData = materialTypeSchema.parse(body)

    // 名前の重複チェック
    const existing = await prisma.materialType.findUnique({
      where: { name: validatedData.name },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'この素材項目名は既に使用されています' },
        { status: 409 }
      )
    }

    // 最大orderを取得して+1
    const maxOrder = await prisma.materialType.aggregate({
      _max: { order: true },
    })
    const newOrder = (maxOrder._max.order ?? -1) + 1

    const materialType = await prisma.materialType.create({
      data: {
        name: validatedData.name,
        order: validatedData.order ?? newOrder,
      },
    })

    return NextResponse.json(
      { materialType },
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Material type create error:', error)
    return NextResponse.json(
      { error: '素材項目の作成に失敗しました' },
      { status: 500 }
    )
  }
}
