import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { consignmentSchema } from '@/lib/validations/consignment'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants'
import { generateConsignmentSku } from '@/lib/utils/sku'
import { buildConsignmentOrderBy, buildConsignmentWhereClause } from '@/lib/consignments/query'
import { createChangeLog } from '@/lib/changelog'
import type { ConsignmentFilters } from '@/lib/types'

// GET /api/consignments - 委託品一覧取得
export async function GET(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)

    // クエリパラメータの取得
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE))

    // ソートパラメータの取得
    const sortBy = searchParams.get('sortBy') || undefined
    const sortOrder = searchParams.get('sortOrder') || undefined

    // フィルター条件の取得
    const filters: ConsignmentFilters = {
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      manufacturerId: searchParams.get('manufacturerId') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      arrivalDate: searchParams.get('arrivalDate') || undefined,
      includeSold: searchParams.get('includeSold') === 'true',
    }

    // ソート条件の構築
    const orderBy = buildConsignmentOrderBy(sortBy, sortOrder)

    // バリデーション
    if (page < 1 || limit < 1 || limit > MAX_PAGE_SIZE) {
      return NextResponse.json(
        { error: '無効なページネーションパラメータです' },
        { status: 400 }
      )
    }

    // 検索条件の構築
    const where = buildConsignmentWhereClause(filters)

    // 総件数の取得
    const total = await prisma.consignment.count({ where })

    // 委託品一覧の取得
    const consignments = await prisma.consignment.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        manufacturer: {
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
          select: {
            id: true,
            url: true,
            order: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    })

    // 原価合計を計算して追加（委託品は常に0だが一貫性のため）
    const formattedConsignments = consignments.map((consignment) => ({
      ...consignment,
      totalCost: consignment.costPrice.mul(consignment.quantity).toString(),
    }))

    return NextResponse.json({
      consignments: formattedConsignments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('委託品一覧取得エラー:', error)
    return NextResponse.json(
      { error: '委託品一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST /api/consignments - 委託品新規作成（SKU自動採番、原価は0）
export async function POST(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()

    // バリデーション
    const validatedData = consignmentSchema.parse(body)

    // SKU自動採番
    const sku = await generateConsignmentSku()

    // 委託品作成（原価は常に0）
    const consignment = await prisma.consignment.create({
      data: {
        sku,
        name: validatedData.name,
        manufacturerId: validatedData.manufacturerId || null,
        categoryId: validatedData.categoryId || null,
        specification: validatedData.specification || null,
        size: validatedData.size || null,
        fabricColor: validatedData.fabricColor || null,
        quantity: validatedData.quantity || 0,
        unitId: validatedData.unitId || null,
        costPrice: 0,  // 委託品は原価0
        listPrice: validatedData.listPrice || null,
        arrivalDate: validatedData.arrivalDate || null,
        locationId: validatedData.locationId || null,
        notes: validatedData.notes || null,
        isSold: validatedData.isSold || false,
        soldAt: validatedData.soldAt ? new Date(validatedData.soldAt) : null,
      },
      include: {
        category: true,
        manufacturer: true,
        location: true,
        unit: true,
        images: true,
      },
    })

    // 原価合計を追加
    const formattedConsignment = {
      ...consignment,
      totalCost: consignment.costPrice.mul(consignment.quantity).toString(),
    }

    // 変更履歴を記録
    if (auth.user) {
      await createChangeLog({
        entityType: 'consignment',
        entityId: consignment.id,
        entityName: consignment.name,
        entitySku: consignment.sku,
        action: 'create',
        userId: auth.user.id,
        userName: auth.user.username,
      })
    }

    return NextResponse.json(
      { success: true, consignment: formattedConsignment },
      { status: 201 }
    )
  } catch (error) {
    console.error('委託品作成エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '委託品の作成に失敗しました' },
      { status: 500 }
    )
  }
}
