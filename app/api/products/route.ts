import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import { productSchemaV2 } from '@/lib/validations/product'
import { z } from 'zod'
import { authenticateRequest } from '@/lib/auth/middleware'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants'
import { generateSku } from '@/lib/utils/sku'
import { buildProductOrderBy, buildProductWhereClause } from '@/lib/products/query'
import { createChangeLog } from '@/lib/changelog'  // v2.1霑ｽ蜉
import type { ProductFilters } from '@/lib/types'

// GET /api/products - 蝠・刀荳隕ｧ蜿門ｾ暦ｼ・2.0・・
export async function GET(request: NextRequest) {
  // 隱崎ｨｼ繝√ぉ繝・け
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)

    // 繧ｯ繧ｨ繝ｪ繝代Λ繝｡繝ｼ繧ｿ縺ｮ蜿門ｾ・    
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE))

    // 繧ｽ繝ｼ繝医ヱ繝ｩ繝｡繝ｼ繧ｿ縺ｮ蜿門ｾ・    
    const sortBy = searchParams.get('sortBy') || undefined
    const sortOrder = searchParams.get('sortOrder') || undefined
    const view = searchParams.get('view') === 'grid' ? 'grid' : 'list'

    // 繝輔ぅ繝ｫ繧ｿ繝ｼ譚｡莉ｶ縺ｮ蜿門ｾ暦ｼ・2.2・・    
    const tagIdsParam = searchParams.get('tagIds')
    const filters: ProductFilters = {
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      manufacturerId: searchParams.get('manufacturerId') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      arrivalDate: searchParams.get('arrivalDate') || undefined,
      tagIds: tagIdsParam ? tagIdsParam.split(',').filter(id => id) : undefined,  // v2.2霑ｽ蜉
      includeSold: searchParams.get('includeSold') === 'true',  // v2.1霑ｽ蜉
    }

    // 繧ｽ繝ｼ繝域擅莉ｶ縺ｮ讒狗ｯ・    
    const orderBy = buildProductOrderBy(sortBy, sortOrder)

    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
    if (page < 1 || limit < 1 || limit > MAX_PAGE_SIZE) {
      return NextResponse.json(
        { error: '辟｡蜉ｹ縺ｪ繝壹・繧ｸ繝阪・繧ｷ繝ｧ繝ｳ繝代Λ繝｡繝ｼ繧ｿ縺ｧ縺・ '},
        { status: 400 }
      )
    }

    // 讀懃ｴ｢譚｡莉ｶ縺ｮ讒狗ｯ・    
    const where = buildProductWhereClause(filters)

    // 邱丈ｻｶ謨ｰ縺ｮ蜿門ｾ・    
    const total = await prisma.product.count({ where })

    const include: Prisma.ProductInclude = {
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
    }

    if (view === 'grid') {
      include.images = {
        orderBy: {
          order: 'asc',
        },
        take: 1,
        select: {
          id: true,
          url: true,
          order: true,
        },
      }
    }

    if (view === 'list') {
      include.tags = {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }
    }

    const products = await prisma.product.findMany({
      where,
      include,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    })

    // 蜴滉ｾ｡蜷郁ｨ医ｒ險育ｮ励＠縺ｦ霑ｽ蜉
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
    console.error('蝠・刀荳隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error)
    return NextResponse.json(
      { error: '蝠・刀荳隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' },
      { status: 500 }
    )
  }
}

// POST /api/products - 蝠・刀譁ｰ隕丈ｽ懈・・・2.0 - SKU閾ｪ蜍墓治逡ｪ・・
export async function POST(request: NextRequest) {
  // 隱崎ｨｼ繝√ぉ繝・け
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()

    // 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ・・2.0繧ｹ繧ｭ繝ｼ繝橸ｼ・    
    const validatedData = productSchemaV2.parse(body)

    // SKU閾ｪ蜍墓治逡ｪ
    const sku = await generateSku()

    // 蝠・刀菴懈・・・2.2・・    
    const product = await prisma.product.create({
      data: {
        sku,
        name: validatedData.name,
        manufacturerId: validatedData.manufacturerId || null,
        categoryId: validatedData.categoryId || null,
        specification: validatedData.specification || null,
        size: validatedData.size || null,  // v2.1霑ｽ蜉
        fabricColor: validatedData.fabricColor || null,
        quantity: validatedData.quantity || 0,
        unitId: validatedData.unitId || null,
        costPrice: validatedData.costPrice,
        listPrice: validatedData.listPrice || null,
        arrivalDate: validatedData.arrivalDate || null,
        locationId: validatedData.locationId || null,
        notes: validatedData.notes || null,
        isSold: validatedData.isSold || false,  // v2.1霑ｽ蜉
        soldAt: validatedData.soldAt ? new Date(validatedData.soldAt) : null,  // v2.1霑ｽ蜉
        // v2.2霑ｽ蜉: 繧ｿ繧ｰ縺ｮ髢｢騾｣莉倥￠
        tags: validatedData.tagIds && validatedData.tagIds.length > 0
          ? {
              create: validatedData.tagIds.map((tagId) => ({
                tagId,
              })),
            }
          : undefined,
        // v2.2霑ｽ蜉: 逕ｻ蜒上・菫晏ｭ・
        images: validatedData.images && validatedData.images.length > 0
          ? {
              create: validatedData.images.map((image) => ({
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
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    // 蜴滉ｾ｡蜷郁ｨ医ｒ霑ｽ蜉
    const formattedProduct = {
      ...product,
      totalCost: product.costPrice.mul(product.quantity).toString(),
    }

    // v2.1霑ｽ蜉: 螟画峩螻･豁ｴ繧定ｨ倬鹸
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
    console.error('蝠・刀菴懈・繧ｨ繝ｩ繝ｼ:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: '繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｨ繝ｩ繝ｼ', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: '蝠・刀縺ｮ菴懈・縺ｫ螟ｱ謨励＠縺ｾ縺励◆' },
      { status: 500 }
    )
  }
}
