import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { z } from 'zod'

const materialsSchema = z.object({
  materials: z.array(z.object({
    materialTypeId: z.string(),
    description: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    order: z.number().int().min(0).default(0),
  })),
})

// PUT /api/items/:id/materials - アイテムの素材情報を一括更新
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const params = await context.params
    const body = await request.json()
    const { materials } = materialsSchema.parse(body)

    // アイテムの存在確認
    const item = await prisma.item.findUnique({
      where: { id: params.id },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'アイテムが見つかりません' },
        { status: 404 }
      )
    }

    // 既存の素材を削除して新規作成（トランザクション）
    await prisma.$transaction(async (tx) => {
      await tx.itemMaterial.deleteMany({
        where: { itemId: params.id },
      })

      if (materials.length > 0) {
        await tx.itemMaterial.createMany({
          data: materials.map((m) => ({
            itemId: params.id,
            materialTypeId: m.materialTypeId,
            description: m.description || null,
            imageUrl: m.imageUrl || null,
            order: m.order,
          })),
        })
      }
    })

    // 更新後のデータを取得
    const updatedMaterials = await prisma.itemMaterial.findMany({
      where: { itemId: params.id },
      orderBy: { order: 'asc' },
      include: {
        materialType: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      materials: updatedMaterials,
    })
  } catch (error) {
    console.error('素材情報更新エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '素材情報の更新に失敗しました' },
      { status: 500 }
    )
  }
}
