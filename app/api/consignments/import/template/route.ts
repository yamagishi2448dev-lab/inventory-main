import { NextResponse } from 'next/server'

const CONSIGNMENT_IMPORT_HEADERS = [
  '商品名',
  'メーカー',
  '品目',
  '仕様',
  'サイズ',
  '張地/カラー',
  '個数',
  '単位',
  '定価単価',
  '入荷年月',
  '場所',
  '備考',
  '販売済み',
  '販売日時',
]

export async function GET() {
  const BOM = '\uFEFF'
  const csvContent = BOM + CONSIGNMENT_IMPORT_HEADERS.join(',') + '\r\n'

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="consignment_import_template.csv"',
    },
  })
}
