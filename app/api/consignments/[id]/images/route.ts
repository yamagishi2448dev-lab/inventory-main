import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { z } from 'zod'

// 画像追加スキーマ
const addImageSchema = z.object({
  url: z.string().url('有効なURLを入力してください'),
  order: z.number().int().min(0).optional().default(0),
})

// GET /api/consignments/:id/images - 委託品画像一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { id } = await params

    const images = await prisma.consignmentImage.findMany({
      where: { consignmentId: id },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ images })
  } catch (error) {
    console.error('委託品画像取得エラー:', error)
    return NextResponse.json(
      { error: '画像の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST /api/consignments/:id/images - 委託品画像追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = addImageSchema.parse(body)

    // 委託品の存在確認
    const consignment = await prisma.consignment.findUnique({
      where: { id },
    })

    if (!consignment) {
      return NextResponse.json(
        { error: '委託品が見つかりません' },
        { status: 404 }
      )
    }

    // 現在の最大orderを取得
    const maxOrder = await prisma.consignmentImage.aggregate({
      where: { consignmentId: id },
      _max: { order: true },
    })

    const image = await prisma.consignmentImage.create({
      data: {
        consignmentId: id,
        url: validatedData.url,
        order: validatedData.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    })

    return NextResponse.json({ image }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }
    console.error('委託品画像追加エラー:', error)
    return NextResponse.json(
      { error: '画像の追加に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/consignments/:id/images - 委託品画像一括更新（並び替え）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { id } = await params
    const body = await request.json()

    const imagesSchema = z.array(
      z.object({
        id: z.string(),
        order: z.number().int().min(0),
      })
    )
    const validatedData = imagesSchema.parse(body)

    // 一括更新
    await prisma.$transaction(
      validatedData.map((img) =>
        prisma.consignmentImage.update({
          where: { id: img.id },
          data: { order: img.order },
        })
      )
    )

    const images = await prisma.consignmentImage.findMany({
      where: { consignmentId: id },
      orderBy: { order: 'asc' },
    })

    return NextResponse.json({ images })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }
    console.error('委託品画像更新エラー:', error)
    return NextResponse.json(
      { error: '画像の更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/consignments/:id/images - 委託品画像削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('imageId')

    if (!imageId) {
      return NextResponse.json(
        { error: '画像IDが指定されていません' },
        { status: 400 }
      )
    }

    await prisma.consignmentImage.delete({
      where: { id: imageId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('委託品画像削除エラー:', error)
    return NextResponse.json(
      { error: '画像の削除に失敗しました' },
      { status: 500 }
    )
  }
}
