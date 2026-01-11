import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { buildProductOrderBy } from '@/lib/products/query'

const printSchema = z.object({
  productIds: z.array(z.string().cuid()).min(1, '印刷対象の商品が選択されていません'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// POST /api/products/print - 印刷用の商品情報取得
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()
    const validationResult = printSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'バリデーションエラー',
          details: validationResult.error.issues,
        },
        { status: 400 }
      )
    }

    const { productIds, sortBy, sortOrder } = validationResult.data
    const orderBy = buildProductOrderBy(sortBy, sortOrder)

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      include: {
        manufacturer: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
        images: {
          orderBy: {
            order: 'asc',
          },
          take: 1,
          select: {
            id: true,
            url: true,
            order: true,
          },
        },
      },
      orderBy,
    })

    return NextResponse.json(
      {
        products,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Print products error:', error)
    return NextResponse.json(
      { error: '印刷用の商品取得に失敗しました' },
      { status: 500 }
    )
  }
}
