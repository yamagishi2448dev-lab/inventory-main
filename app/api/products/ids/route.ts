import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { buildProductOrderBy, buildProductWhereClause } from '@/lib/products/query'
import type { ProductFilters } from '@/lib/types'

// GET /api/products/ids - フィルタ結果のID一覧取得
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)

    // タグフィルター対応（v2.2追加）
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

    const sortBy = searchParams.get('sortBy') || undefined
    const sortOrder = searchParams.get('sortOrder') || undefined
    const orderBy = buildProductOrderBy(sortBy, sortOrder)

    const where = buildProductWhereClause(filters)

    const products = await prisma.product.findMany({
      where,
      select: { id: true },
      orderBy,
    })

    return NextResponse.json(
      {
        productIds: products.map((product) => product.id),
        total: products.length,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    )
  } catch (error) {
    console.error('Product IDs fetch error:', error)
    return NextResponse.json(
      { error: '商品ID一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}
