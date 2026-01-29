import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { statsResponse } from '@/lib/api/response'

// v2.0 ダッシュボード統計API
export async function GET() {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    // 商品総数、品目数、メーカー数、原価合計を並列取得
    const [totalProducts, totalCategories, totalManufacturers, costResult] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.manufacturer.count(),
      // DB側でSUM計算を実行（最適化）
      prisma.$queryRaw<[{ total: number | null }]>`
        SELECT COALESCE(SUM("costPrice" * quantity), 0) as total
        FROM products
      `
    ])

    const totalCost = costResult[0]?.total || 0

    return statsResponse({
      totalProducts,
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
