import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { buildConsignmentWhereClause } from '@/lib/consignments/query'
import type { ConsignmentFilters } from '@/lib/types'

// GET /api/consignments/export - 委託品CSVエクスポート
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)

    // フィルター条件の取得
    const filters: ConsignmentFilters = {
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      manufacturerId: searchParams.get('manufacturerId') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      arrivalDate: searchParams.get('arrivalDate') || undefined,
      includeSold: searchParams.get('includeSold') === 'true',
    }

    // 検索条件の構築
    const where = buildConsignmentWhereClause(filters)

    // 委託品取得
    const consignments = await prisma.consignment.findMany({
      where,
      include: {
        category: { select: { name: true } },
        manufacturer: { select: { name: true } },
        location: { select: { name: true } },
        unit: { select: { name: true } },
        tags: {
          include: {
            tag: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // CSV生成
    const headers = [
      'SKU',
      '商品名',
      'メーカー',
      '品目',
      '仕様',
      'サイズ',
      '張地/カラー',
      '個数',
      '単位',
      '原価単価',
      '定価単価',
      '入荷年月',
      '場所',
      'デザイナー',
      'タグ',
      '備考',
      '販売済み',
      '販売日時',
    ]

    const rows = consignments.map((c) => {
      // タグをパイプ区切りで結合
      const tagNames = c.tags.map((ct) => ct.tag.name).join('|')
      return [
        c.sku,
        c.name,
        c.manufacturer?.name || '',
        c.category?.name || '',
        c.specification || '',
        c.size || '',
        c.fabricColor || '',
        String(c.quantity),
        c.unit?.name || '',
        c.costPrice.toString(),
        c.listPrice?.toString() || '',
        c.arrivalDate || '',
        c.location?.name || '',
        c.designer || '',
        tagNames,
        c.notes || '',
        c.isSold ? 'はい' : 'いいえ',
        c.soldAt ? new Date(c.soldAt).toLocaleString('ja-JP') : '',
      ]
    })

    // BOM付きUTF-8でCSVを生成
    const BOM = '\uFEFF'
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="consignments_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('委託品エクスポートエラー:', error)
    return NextResponse.json(
      { error: 'エクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
