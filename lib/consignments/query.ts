import type { Prisma } from '@prisma/client'
import type { ConsignmentFilters, ConsignmentSortField, ConsignmentSortOrder } from '@/lib/types'

const CONSIGNMENT_SORT_FIELDS: ConsignmentSortField[] = [
  'manufacturer',
  'category',
  'name',
  'specification',
  'quantity',
  'listPrice',
  'location',
  'createdAt',
]

export function buildConsignmentOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.ConsignmentOrderByWithRelationInput {
  const order: ConsignmentSortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

  if (!sortBy || !CONSIGNMENT_SORT_FIELDS.includes(sortBy as ConsignmentSortField)) {
    return { createdAt: 'desc' }
  }

  switch (sortBy as ConsignmentSortField) {
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

export function buildConsignmentWhereClause(
  filters: ConsignmentFilters
): Prisma.ConsignmentWhereInput {
  const where: Prisma.ConsignmentWhereInput = {}

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { specification: { contains: filters.search } },
    ]
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId
  }

  if (filters.manufacturerId) {
    where.manufacturerId = filters.manufacturerId
  }

  if (filters.locationId) {
    where.locationId = filters.locationId
  }

  if (filters.arrivalDate) {
    where.arrivalDate = { contains: filters.arrivalDate }
  }

  // 販売済みフィルター（デフォルトは販売済みを除外）
  // isSoldがnullの場合も「販売済みでない」として扱う
  if (!filters.includeSold) {
    where.isSold = { not: true }
  }

  // v2.2: タグフィルター（OR条件）
  if (filters.tagIds && filters.tagIds.length > 0) {
    where.tags = {
      some: {
        tagId: { in: filters.tagIds },
      },
    }
  }

  return where
}
