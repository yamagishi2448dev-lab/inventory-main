import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { buildConsignmentOrderBy } from '@/lib/consignments/query'

const printSchema = z.object({
  consignmentIds: z.array(z.string().cuid()).min(1, '印刷対象の委託品が選択されていません'),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

// POST /api/consignments/print - 印刷用の委託品情報取得
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

    const { consignmentIds, sortBy, sortOrder } = validationResult.data
    const orderBy = buildConsignmentOrderBy(sortBy, sortOrder)

    const consignments = await prisma.consignment.findMany({
      where: {
        id: {
          in: consignmentIds,
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
        consignments,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Print consignments error:', error)
    return NextResponse.json(
      { error: '印刷用の委託品取得に失敗しました' },
      { status: 500 }
    )
  }
}
