import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'

// v2.0 ダッシュボード統計API
export async function GET() {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    // 商品総数
    const totalProducts = await prisma.product.count()

    // 品目数
    const totalCategories = await prisma.category.count()

    // メーカー数
    const totalManufacturers = await prisma.manufacturer.count()

    // 全商品の原価合計を計算
    const products = await prisma.product.findMany({
      select: {
        costPrice: true,
        quantity: true,
      },
    })

    const totalCost = products.reduce((sum, product) => {
      return sum + (product.costPrice.toNumber() * product.quantity)
    }, 0)

    return NextResponse.json({
      totalProducts,
      totalCategories,
      totalManufacturers,
      totalCost: totalCost.toFixed(2),
    })
  } catch (error) {
    console.error('統計情報取得エラー:', error)
    return NextResponse.json(
      { error: '統計情報の取得に失敗しました' },
      { status: 500 }
    )
  }
}
