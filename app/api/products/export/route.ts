import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

// CSVヘッダー（日本語）
const CSV_HEADERS = [
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

export async function GET() {
  try {
    // 全商品を取得（リレーション込み）
    const products = await prisma.product.findMany({
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
    for (const product of products) {
      // タグをパイプ区切りで結合
      const tagNames = product.tags.map((pt) => pt.tag.name).join('|')
      const row = [
        escapeCSV(product.id),
        escapeCSV(product.sku),
        escapeCSV(product.name),
        escapeCSV(product.manufacturer?.name),
        escapeCSV(product.category?.name),
        escapeCSV(product.specification),
        escapeCSV(product.size),
        escapeCSV(product.fabricColor),
        String(product.quantity),
        escapeCSV(product.unit?.name),
        String(product.costPrice),
        product.listPrice ? String(product.listPrice) : '',
        escapeCSV(product.arrivalDate),
        escapeCSV(product.location?.name),
        escapeCSV(product.designer),
        escapeCSV(tagNames),
        escapeCSV(product.notes),
        product.isSold ? 'はい' : 'いいえ',
        product.soldAt ? formatDateTime(product.soldAt) : '',
        formatDateTime(product.createdAt),
        formatDateTime(product.updatedAt),
      ]
      rows.push(row.join(','))
    }

    // CSV文字列を生成（BOM付きUTF-8でExcel対応）
    const BOM = '\uFEFF'
    const csvContent = BOM + rows.join('\r\n')

    // ファイル名（日付入り）
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '')
    const filename = `products_${dateStr}.csv`

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
