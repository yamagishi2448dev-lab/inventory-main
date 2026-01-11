import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { z } from 'zod'

// バリデーションスキーマ
const productMaterialSchema = z.object({
  materialTypeId: z.string().min(1, '素材項目を選択してください'),
  description: z.string().max(500, '説明は500文字以内で入力してください').optional().nullable(),
  imageUrl: z.string().url('有効なURLを入力してください').optional().nullable(),
  order: z.number().int().min(0).optional().default(0),
})

const bulkMaterialsSchema = z.object({
  materials: z.array(productMaterialSchema),
})

// GET /api/products/:id/materials - 商品の素材一覧取得
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

    // 商品の存在確認
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    const materials = await prisma.productMaterial.findMany({
      where: { productId: id },
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

    return NextResponse.json(
      { materials },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Product materials fetch error:', error)
    return NextResponse.json(
      { error: '素材情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST /api/products/:id/materials - 商品の素材追加
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
    const validatedData = productMaterialSchema.parse(body)

    // 商品の存在確認
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 素材項目の存在確認
    const materialType = await prisma.materialType.findUnique({
      where: { id: validatedData.materialTypeId },
    })

    if (!materialType) {
      return NextResponse.json(
        { error: '素材項目が見つかりません' },
        { status: 404 }
      )
    }

    // 最大orderを取得
    const maxOrder = await prisma.productMaterial.aggregate({
      where: { productId: id },
      _max: { order: true },
    })
    const newOrder = (maxOrder._max.order ?? -1) + 1

    const material = await prisma.productMaterial.create({
      data: {
        productId: id,
        materialTypeId: validatedData.materialTypeId,
        description: validatedData.description || null,
        imageUrl: validatedData.imageUrl || null,
        order: validatedData.order ?? newOrder,
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

    return NextResponse.json(
      { material },
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
    console.error('Product material create error:', error)
    return NextResponse.json(
      { error: '素材情報の追加に失敗しました' },
      { status: 500 }
    )
  }
}

// PUT /api/products/:id/materials - 商品の素材を一括更新
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
    const validatedData = bulkMaterialsSchema.parse(body)

    // 商品の存在確認
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // トランザクションで一括更新
    const result = await prisma.$transaction(async (tx) => {
      // 既存の素材を全て削除
      await tx.productMaterial.deleteMany({
        where: { productId: id },
      })

      // 新しい素材を追加
      const materials = await Promise.all(
        validatedData.materials.map(async (material, index) => {
          return tx.productMaterial.create({
            data: {
              productId: id,
              materialTypeId: material.materialTypeId,
              description: material.description || null,
              imageUrl: material.imageUrl || null,
              order: material.order ?? index,
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
        })
      )

      return materials
    })

    return NextResponse.json(
      { materials: result },
      {
        status: 200,
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
    console.error('Product materials update error:', error)
    return NextResponse.json(
      { error: '素材情報の更新に失敗しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/:id/materials - 商品の素材を全削除
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

    // 商品の存在確認
    const product = await prisma.product.findUnique({
      where: { id },
    })

    if (!product) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    await prisma.productMaterial.deleteMany({
      where: { productId: id },
    })

    return NextResponse.json(
      { message: '素材情報を削除しました' },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Product materials delete error:', error)
    return NextResponse.json(
      { error: '素材情報の削除に失敗しました' },
      { status: 500 }
    )
  }
}
