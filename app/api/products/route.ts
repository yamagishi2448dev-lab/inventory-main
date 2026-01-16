import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { productSchemaV2 } from '@/lib/validations/product'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants'
import { generateSku } from '@/lib/utils/sku'
import { buildProductOrderBy, buildProductWhereClause } from '@/lib/products/query'
import { createChangeLog } from '@/lib/changelog'  // v2.1追加
import type { ProductFilters } from '@/lib/types'

// GET /api/products - 商品一覧取得（v2.0）
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

    // フィルター条件の取得（v2.2）
    const tagIdsParam = searchParams.get('tagIds')
    const filters: ProductFilters = {
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      manufacturerId: searchParams.get('manufacturerId') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      arrivalDate: searchParams.get('arrivalDate') || undefined,
      tagIds: tagIdsParam ? tagIdsParam.split(',').filter(id => id) : undefined,  // v2.2追加
      includeSold: searchParams.get('includeSold') === 'true',  // v2.1追加
    }

    // ソート条件の構築
    const orderBy = buildProductOrderBy(sortBy, sortOrder)

    // バリデーション
    if (page < 1 || limit < 1 || limit > MAX_PAGE_SIZE) {
      return NextResponse.json(
        { error: '無効なページネーションパラメータです' },
        { status: 400 }
      )
    }

    // 検索条件の構築
    const where = buildProductWhereClause(filters)

    // 総件数の取得
    const total = await prisma.product.count({ where })

    // 商品一覧の取得（v2.0）
    const products = await prisma.product.findMany({
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
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    })

    // 原価合計を計算して追加
    const formattedProducts = products.map((product) => ({
      ...product,
      totalCost: product.costPrice.mul(product.quantity).toString(),
    }))

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('商品一覧取得エラー:', error)
    return NextResponse.json(
      { error: '商品一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST /api/products - 商品新規作成（v2.0 - SKU自動採番）
export async function POST(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()

    // バリデーション（v2.0スキーマ）
    const validatedData = productSchemaV2.parse(body)

    // SKU自動採番
    const sku = await generateSku()

    // 商品作成（v2.2）
    const product = await prisma.product.create({
      data: {
        sku,
        name: validatedData.name,
        manufacturerId: validatedData.manufacturerId || null,
        categoryId: validatedData.categoryId || null,
        specification: validatedData.specification || null,
        size: validatedData.size || null,  // v2.1追加
        fabricColor: validatedData.fabricColor || null,
        quantity: validatedData.quantity || 0,
        unitId: validatedData.unitId || null,
        costPrice: validatedData.costPrice,
        listPrice: validatedData.listPrice || null,
        arrivalDate: validatedData.arrivalDate || null,
        locationId: validatedData.locationId || null,
        notes: validatedData.notes || null,
        isSold: validatedData.isSold || false,  // v2.1追加
        soldAt: validatedData.soldAt ? new Date(validatedData.soldAt) : null,  // v2.1追加
        // v2.2追加: タグの関連付け
        tags: validatedData.tagIds && validatedData.tagIds.length > 0
          ? {
              create: validatedData.tagIds.map((tagId) => ({
                tagId,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        manufacturer: true,
        location: true,
        unit: true,
        images: true,
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // 原価合計を追加
    const formattedProduct = {
      ...product,
      totalCost: product.costPrice.mul(product.quantity).toString(),
    }

    // v2.1追加: 変更履歴を記録
    if (auth.user) {
      await createChangeLog({
        entityType: 'product',
        entityId: product.id,
        entityName: product.name,
        entitySku: product.sku,
        action: 'create',
        userId: auth.user.id,
        userName: auth.user.username,
      })
    }

    return NextResponse.json(
      { success: true, product: formattedProduct },
      { status: 201 }
    )
  } catch (error) {
    console.error('商品作成エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '商品の作成に失敗しました' },
      { status: 500 }
    )
  }
}
