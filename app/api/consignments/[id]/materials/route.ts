import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { z } from 'zod'

// 素材追加スキーマ
const materialSchema = z.object({
  materialTypeId: z.string().cuid('無効な素材項目IDです'),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  order: z.number().int().min(0).optional().default(0),
})

// 素材一括更新スキーマ
const materialsUpdateSchema = z.array(
  z.object({
    id: z.string().cuid().optional(),  // 新規の場合はなし
    materialTypeId: z.string().cuid('無効な素材項目IDです'),
    description: z.string().max(500).optional().nullable(),
    imageUrl: z.string().url().optional().nullable(),
    order: z.number().int().min(0),
  })
)

// GET /api/consignments/:id/materials - 委託品素材一覧取得
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

    const materials = await prisma.consignmentMaterial.findMany({
      where: { consignmentId: id },
      orderBy: { order: 'asc' },
      include: {
        materialType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ materials })
  } catch (error) {
    console.error('委託品素材取得エラー:', error)
    return NextResponse.json(
      { error: '素材の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST /api/consignments/:id/materials - 委託品素材追加
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
    const validatedData = materialSchema.parse(body)

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
    const maxOrder = await prisma.consignmentMaterial.aggregate({
      where: { consignmentId: id },
      _max: { order: true },
    })

    const material = await prisma.consignmentMaterial.create({
      data: {
        consignmentId: id,
        materialTypeId: validatedData.materialTypeId,
        description: validatedData.description || null,
        imageUrl: validatedData.imageUrl || null,
        order: validatedData.order ?? (maxOrder._max.order ?? -1) + 1,
      },
      include: {
        materialType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ material }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }
    console.error('委託品素材追加エラー:', error)
    return NextResponse.json(
      { error: '素材の追加に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/consignments/:id/materials - 委託品素材一括更新
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
    const validatedData = materialsUpdateSchema.parse(body)

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

    // トランザクションで一括更新
    await prisma.$transaction(async (tx) => {
      // 既存の素材を全削除
      await tx.consignmentMaterial.deleteMany({
        where: { consignmentId: id },
      })

      // 新しい素材を作成
      if (validatedData.length > 0) {
        await tx.consignmentMaterial.createMany({
          data: validatedData.map((m) => ({
            consignmentId: id,
            materialTypeId: m.materialTypeId,
            description: m.description || null,
            imageUrl: m.imageUrl || null,
            order: m.order,
          })),
        })
      }
    })

    // 更新後の素材を取得
    const materials = await prisma.consignmentMaterial.findMany({
      where: { consignmentId: id },
      orderBy: { order: 'asc' },
      include: {
        materialType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json({ materials })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }
    console.error('委託品素材更新エラー:', error)
    return NextResponse.json(
      { error: '素材の更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/consignments/:id/materials - 委託品素材全削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { id } = await params

    await prisma.consignmentMaterial.deleteMany({
      where: { consignmentId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('委託品素材削除エラー:', error)
    return NextResponse.json(
      { error: '素材の削除に失敗しました' },
      { status: 500 }
    )
  }
}
