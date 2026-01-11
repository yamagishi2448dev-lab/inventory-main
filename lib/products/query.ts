import type { Prisma } from '@prisma/client'
import type { ProductFilters, ProductSortField, ProductSortOrder } from '@/lib/types'

const PRODUCT_SORT_FIELDS: ProductSortField[] = [
  'manufacturer',
  'category',
  'name',
  'specification',
  'quantity',
  'costPrice',
  'location',
  'createdAt',
]

export function buildProductOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.ProductOrderByWithRelationInput {
  const order: ProductSortOrder = sortOrder === 'asc' ? 'asc' : 'desc'

  if (!sortBy || !PRODUCT_SORT_FIELDS.includes(sortBy as ProductSortField)) {
    return { createdAt: 'desc' }
  }

  switch (sortBy as ProductSortField) {
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

export function buildProductWhereClause(
  filters: ProductFilters
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {}

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { sku: { contains: filters.search } },
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

  // v2.1: 販売済みフィルター（デフォルトは販売済みを除外）
  if (!filters.includeSold) {
    where.isSold = false
  }

  return where
}
