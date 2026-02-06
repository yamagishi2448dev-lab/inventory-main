import type { Prisma } from '@prisma/client'
import type { ItemFilters, ItemSortField, ItemSortOrder, ItemType } from '@/lib/types'

const ITEM_SORT_FIELDS: ItemSortField[] = [
  'manufacturer',
  'category',
  'name',
  'specification',
  'quantity',
  'costPrice',
  'listPrice',
  'location',
  'createdAt',
]

export function buildItemOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.ItemOrderByWithRelationInput {
  const order: ItemSortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

  if (!sortBy || !ITEM_SORT_FIELDS.includes(sortBy as ItemSortField)) {
    return { createdAt: 'desc' }
  }

  switch (sortBy as ItemSortField) {
    case 'manufacturer':
      return { manufacturer: { name: order } }
    case 'category':
      return { category: { name: order } }
    case 'location':
      return { location: { name: order } }
    default:
      return { [sortBy]: order }
  }
}

export function buildItemWhereClause(
  filters: ItemFilters
): Prisma.ItemWhereInput {
  const where: Prisma.ItemWhereInput = {}

  // アイテム種別フィルター
  if (filters.itemType) {
    where.itemType = filters.itemType
  }

  // 検索（名前・仕様）
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { specification: { contains: filters.search } },
    ]
  }

  // 品目フィルター
  if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }

  // メーカーフィルター
  if (filters.manufacturerId) {
    where.manufacturerId = filters.manufacturerId
  }

  // 場所フィルター
  if (filters.locationId) {
    where.locationId = filters.locationId
  }

  // 入荷年月フィルター
  if (filters.arrivalDate) {
    where.arrivalDate = { contains: filters.arrivalDate }
  }

  // 販売済みフィルター（デフォルトは販売済みを除外）
  if (!filters.includeSold) {
    where.isSold = false
  }

  // タグフィルター（OR条件）
  if (filters.tagIds && filters.tagIds.length > 0) {
    where.tags = {
      some: {
        tagId: { in: filters.tagIds },
      },
    }
  }

  return where
}

/**
 * アイテム取得用のinclude設定
 */
export const itemInclude = {
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
      order: 'asc' as const,
    },
    select: {
      id: true,
      url: true,
      order: true,
    },
  },
  materials: {
    orderBy: {
      order: 'asc' as const,
    },
    include: {
      materialType: {
        select: {
          id: true,
          name: true,
          order: true,
        },
      },
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
} as const

/**
 * アイテム一覧取得用のinclude設定（パフォーマンス最適化版）
 */
export const itemListInclude = {
  ...itemInclude,
  images: {
    orderBy: {
      order: 'asc' as const,
    },
    select: {
      id: true,
      url: true,
      order: true,
    },
    take: 1,  // 一覧表示用に最初の1件のみ
  },
  materials: undefined,  // 一覧では素材情報不要
} as const

/**
 * アイテムの原価合計を計算
 */
export function calculateTotalCost(item: { costPrice: { mul: (n: number) => { toString: () => string } } | null; quantity: number }): string {
  if (!item.costPrice) return '0'
  return item.costPrice.mul(item.quantity).toString()
}
