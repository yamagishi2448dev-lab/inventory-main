import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { authenticateRequest } from '@/lib/auth/middleware'
import { buildItemWhereClause } from '@/lib/items/query'
import type { ItemFilters, ItemType } from '@/lib/types'

// CSVヘッダー（日本語）- 種別列を追加
const CSV_HEADERS = [
  '種別',
  'ID',
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
  '作成日時',
  '更新日時',
]

// CSV用にエスケープ（ダブルクォート対応）
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  const str = String(value)
  // ダブルクォート、カンマ、改行を含む場合はクォートで囲む
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// 日時フォーマット
function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

// アイテム種別の表示名
function getItemTypeLabel(itemType: string): string {
  return itemType === 'PRODUCT' ? '商品' : '委託品'
}

export async function GET(request: NextRequest) {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    const { searchParams } = new URL(request.url)

    // アイテム種別の取得（大文字・小文字両対応）
    const typeParam = searchParams.get('type')?.toUpperCase()
    const itemType: ItemType | undefined = typeParam === 'PRODUCT' ? 'PRODUCT'
      : typeParam === 'CONSIGNMENT' ? 'CONSIGNMENT'
      : undefined

    // フィルター条件の取得
    const tagIdsParam = searchParams.get('tagIds')
    const filters: ItemFilters = {
      itemType,
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      manufacturerId: searchParams.get('manufacturerId') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      arrivalDate: searchParams.get('arrivalDate') || undefined,
      tagIds: tagIdsParam ? tagIdsParam.split(',').filter(id => id) : undefined,
      includeSold: searchParams.get('includeSold') === 'true',
    }

    // 検索条件の構築
    const where = buildItemWhereClause(filters)

    // アイテムを取得（リレーション込み）
    const items = await prisma.item.findMany({
      where,
      include: {
        manufacturer: true,
        category: true,
        unit: true,
        location: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { sku: 'asc' },
    })

    // CSV行を生成
    const rows: string[] = []

    // ヘッダー行
    rows.push(CSV_HEADERS.join(','))

    // データ行
    for (const item of items) {
      // タグをパイプ区切りで結合
      const tagNames = item.tags.map((it) => it.tag.name).join('|')
      const row = [
        escapeCSV(getItemTypeLabel(item.itemType)),
        escapeCSV(item.id),
        escapeCSV(item.sku),
        escapeCSV(item.name),
        escapeCSV(item.manufacturer?.name),
        escapeCSV(item.category?.name),
        escapeCSV(item.specification),
        escapeCSV(item.size),
        escapeCSV(item.fabricColor),
        String(item.quantity),
        escapeCSV(item.unit?.name),
        item.costPrice ? String(item.costPrice) : '',  // 委託品は空欄
        item.listPrice ? String(item.listPrice) : '',
        escapeCSV(item.arrivalDate),
        escapeCSV(item.location?.name),
        escapeCSV(item.designer),
        escapeCSV(tagNames),
        escapeCSV(item.notes),
        item.isSold ? 'はい' : 'いいえ',
        item.soldAt ? formatDateTime(item.soldAt) : '',
        formatDateTime(item.createdAt),
        formatDateTime(item.updatedAt),
      ]
      rows.push(row.join(','))
    }

    // CSV文字列を生成（BOM付きUTF-8でExcel対応）
    const BOM = '\uFEFF'
    const csvContent = BOM + rows.join('\r\n')

    // ファイル名（日付入り）
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
    const typeStr = itemType ? (itemType === 'PRODUCT' ? 'products' : 'consignments') : 'items'
    const filename = `${typeStr}_${dateStr}.csv`

    // レスポンスを返す
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('CSVエクスポートエラー:', error)
    return NextResponse.json(
      { error: 'CSVエクスポートに失敗しました' },
      { status: 500 }
    )
  }
}
