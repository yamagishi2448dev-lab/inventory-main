import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { DASHBOARD_RECENT_ITEMS } from '@/lib/constants'

// v2.0 Dashboard Recent API
export async function GET() {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    // 最近追加された商品
    const recentlyAdded = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        createdAt: true,
        category: {
          select: {
            name: true,
          },
        },
        manufacturer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: DASHBOARD_RECENT_ITEMS,
    })

    // 最近更新された商品
    const recentlyUpdated = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        quantity: true,
        updatedAt: true,
        category: {
          select: {
            name: true,
          },
        },
        manufacturer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: DASHBOARD_RECENT_ITEMS,
    })

    return NextResponse.json({
      recentlyAdded,
      recentlyUpdated,
    })
  } catch (error) {
    console.error('最近の更新取得エラー:', error)
    return NextResponse.json(
      { error: '最近の更新の取得に失敗しました' },
      { status: 500 }
    )
  }
}
