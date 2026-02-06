import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { productItemSchema, consignmentItemSchema } from '@/lib/validations/item'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants'
import { generateItemSku } from '@/lib/utils/sku'
import { buildItemOrderBy, buildItemWhereClause, itemListInclude, calculateTotalCost } from '@/lib/items/query'
import { createChangeLog } from '@/lib/changelog'
import type { ItemFilters, ItemType } from '@/lib/types'

// GET /api/items - アイテム一覧取得
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

    // ソート条件の構築
    const orderBy = buildItemOrderBy(sortBy, sortOrder)

    // バリデーション
    if (page < 1 || limit < 1 || limit > MAX_PAGE_SIZE) {
      return NextResponse.json(
        { error: '無効なページネーションパラメータです' },
        { status: 400 }
      )
    }

    // 検索条件の構築
    const where = buildItemWhereClause(filters)

    // 総件数とアイテム一覧を並列取得
    const [total, items] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
          manufacturer: {
            select: { id: true, name: true },
          },
          location: {
            select: { id: true, name: true },
          },
          unit: {
            select: { id: true, name: true },
          },
          images: {
            orderBy: { order: 'asc' },
            select: { id: true, url: true, order: true },
            take: 1,  // 一覧用に1件のみ
          },
          tags: {
            include: {
              tag: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // 原価合計を計算して追加
    const formattedItems = items.map((item) => ({
      ...item,
      totalCost: calculateTotalCost(item),
    }))

    return NextResponse.json({
      items: formattedItems,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('アイテム一覧取得エラー:', error)
    return NextResponse.json(
      { error: 'アイテム一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// POST /api/items - アイテム新規作成
export async function POST(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()

    // アイテム種別を取得（デフォルトはPRODUCT）
    const itemType: ItemType = body.itemType || 'PRODUCT'

    // バリデーション（種別に応じたスキーマを使用）
    let validatedData
    if (itemType === 'CONSIGNMENT') {
      validatedData = consignmentItemSchema.parse(body)
    } else {
      validatedData = productItemSchema.parse(body)
    }

    // SKU自動採番
    const sku = await generateItemSku(itemType)

    // アイテム作成
    const item = await prisma.item.create({
      data: {
        sku,
        itemType,
        name: validatedData.name,
        manufacturerId: validatedData.manufacturerId || null,
        categoryId: validatedData.categoryId || null,
        specification: validatedData.specification || null,
        size: validatedData.size || null,
        fabricColor: validatedData.fabricColor || null,
        quantity: validatedData.quantity || 0,
        unitId: validatedData.unitId || null,
        costPrice: itemType === 'PRODUCT' ? (validatedData as { costPrice: string }).costPrice : null,
        listPrice: validatedData.listPrice || null,
        arrivalDate: validatedData.arrivalDate || null,
        locationId: validatedData.locationId || null,
        designer: validatedData.designer || null,
        notes: validatedData.notes || null,
        isSold: validatedData.isSold || false,
        soldAt: validatedData.soldAt ? new Date(validatedData.soldAt) : null,
        // タグの関連付け
        tags: validatedData.tagIds && validatedData.tagIds.length > 0
          ? {
              create: validatedData.tagIds.map((tagId: string) => ({
                tagId,
              })),
            }
          : undefined,
        // 画像の保存
        images: validatedData.images && validatedData.images.length > 0
          ? {
              create: validatedData.images.map((image: { url: string; order: number }) => ({
                url: image.url,
                order: image.order,
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
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    // 原価合計を追加
    const formattedItem = {
      ...item,
      totalCost: calculateTotalCost(item),
    }

    // 変更履歴を記録
    if (auth.user) {
      await createChangeLog({
        entityType: 'item',
        entityId: item.id,
        entityName: item.name,
        entitySku: item.sku,
        action: 'create',
        userId: auth.user.id,
        userName: auth.user.username,
        itemType: item.itemType,
      })
    }

    return NextResponse.json(
      { success: true, item: formattedItem },
      { status: 201 }
    )
  } catch (error) {
    console.error('アイテム作成エラー:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'アイテムの作成に失敗しました' },
      { status: 500 }
    )
  }
}
