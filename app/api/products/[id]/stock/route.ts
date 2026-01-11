import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { quantityUpdateSchema } from '@/lib/validations/product'
import { z } from 'zod'

// PATCH /api/products/:id/stock - 個数のみ更新 (v2.0: stock -> quantity)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const body = await request.json()

    // バリデーション (v2.0)
    const validatedData = quantityUpdateSchema.parse(body)

    // 商品の存在確認
    const existingProduct = await prisma.product.findUnique({
      where: { id: params.id },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: '商品が見つかりません' },
        { status: 404 }
      )
    }

    // 個数のみ更新 (v2.0)
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        quantity: validatedData.quantity,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
      },
    })

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error) {
    console.error('個数更新エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '個数の更新に失敗しました' },
      { status: 500 }
    )
  }
}
