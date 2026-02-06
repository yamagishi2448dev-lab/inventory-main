import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { buildItemWhereClause } from '@/lib/items/query'
import type { ItemFilters, ItemType } from '@/lib/types'

// GET /api/items/ids - アイテムIDリスト取得（フィルタ適用可能）
export async function GET(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)

    // アイテム種別の取得（大文字・小文字両対応）
    const typeParam = searchParams.get('type')?.toUpperCase()
    const itemType: ItemType | undefined = typeParam === 'PRODUCT' ? 'PRODUCT'
      : typeParam === 'CONSIGNMENT' ? 'CONSIGNMENT'
      : undefined

    // フィルター条件の取得
    const tagIdsParam = searchParams.get('tagIds')
    const filters: ItemFilters = {
      itemType,
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      manufacturerId: searchParams.get('manufacturerId') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      arrivalDate: searchParams.get('arrivalDate') || undefined,
      tagIds: tagIdsParam ? tagIdsParam.split(',').filter(id => id) : undefined,
      includeSold: searchParams.get('includeSold') === 'true',
    }

    // 検索条件の構築
    const where = buildItemWhereClause(filters)

    // IDのみ取得
    const items = await prisma.item.findMany({
      where,
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      ids: items.map(item => item.id),
    })
  } catch (error) {
    console.error('アイテムID取得エラー:', error)
    return NextResponse.json(
      { error: 'アイテムIDの取得に失敗しました' },
      { status: 500 }
    )
  }
}
