import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'

// v3.0 ダッシュボード統計API - Items統合版
export async function GET() {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    // 統計を並列取得
    const [
      totalProducts,
      totalConsignments,
      totalCategories,
      totalManufacturers,
      costResult
    ] = await Promise.all([
      // 商品数（itemType = 'PRODUCT'）
      prisma.item.count({ where: { itemType: 'PRODUCT' } }),
      // 委託品数（itemType = 'CONSIGNMENT'）
      prisma.item.count({ where: { itemType: 'CONSIGNMENT' } }),
      prisma.category.count(),
      prisma.manufacturer.count(),
      // 原価合計（商品のみ、costPrice IS NOT NULLのもの）
      prisma.$queryRaw<[{ total: number | null }]>`
        SELECT COALESCE(SUM("costPrice" * quantity), 0) as total
        FROM items
        WHERE "itemType" = 'PRODUCT' AND "costPrice" IS NOT NULL
      `
    ])

    const totalCost = costResult[0]?.total || 0

    return NextResponse.json({
      totalProducts,
      totalConsignments,
      totalCategories,
      totalManufacturers,
      totalCost: Number(totalCost).toFixed(2),
    })
  } catch (error) {
    console.error('統計情報取得エラー:', error)
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
