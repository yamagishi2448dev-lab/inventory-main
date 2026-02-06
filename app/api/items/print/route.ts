import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'

// GET /api/items/print - 印刷用データ取得
export async function GET(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json(
        { error: '印刷対象のIDが指定されていません' },
        { status: 400 }
      )
    }

    const ids = idsParam.split(',').filter(id => id)

    if (ids.length === 0) {
      return NextResponse.json(
        { error: '印刷対象のIDが指定されていません' },
        { status: 400 }
      )
    }

    // 印刷用データを取得
    const items = await prisma.item.findMany({
      where: { id: { in: ids } },
      include: {
        manufacturer: {
          select: { name: true },
        },
        unit: {
          select: { name: true },
        },
        images: {
          orderBy: { order: 'asc' },
          select: { url: true },
          take: 1,  // 印刷用に1枚のみ
        },
      },
      orderBy: { sku: 'asc' },
    })

    // 印刷に必要な情報のみ返す
    const printData = items.map(item => ({
      id: item.id,
      sku: item.sku,
      itemType: item.itemType,
      name: item.name,
      manufacturer: item.manufacturer?.name || '',
      specification: item.specification || '',
      fabricColor: item.fabricColor || '',
      listPrice: item.listPrice ? item.listPrice.toString() : '',
      quantity: item.quantity,
      unit: item.unit?.name || '',
      notes: item.notes || '',
      imageUrl: item.images[0]?.url || '',
    }))

    return NextResponse.json({ items: printData })
  } catch (error) {
    console.error('印刷データ取得エラー:', error)
    return NextResponse.json(
      { error: '印刷データの取得に失敗しました' },
      { status: 500 }
    )
  }
}
