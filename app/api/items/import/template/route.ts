import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth/middleware'

// CSVテンプレートヘッダー
const CSV_HEADERS = [
  '種別',
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
]

// サンプルデータ
const SAMPLE_DATA = [
  '商品,サンプル商品A,メーカーA,チェア,サンプル仕様,W600xD600xH800,ファブリック ブルー,2,台,50000,80000,2024年1月,倉庫A,山田太郎,新商品|人気,サンプル備考',
  '委託品,サンプル委託品B,メーカーB,テーブル,,,,,脚,,150000,2024年2月,店舗,,委託|展示品,',
]

export async function GET() {
  // 認証チェック
  const auth = await authenticateRequest()
  if (!auth.success) {
    return auth.response
  }

  try {
    // CSV文字列を生成（BOM付きUTF-8でExcel対応）
    const BOM = '\uFEFF'
    const csvContent = BOM + CSV_HEADERS.join(',') + '\r\n' + SAMPLE_DATA.join('\r\n')

    // レスポンスを返す
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="items_template.csv"',
      },
    })
  } catch (error) {
    console.error('CSVテンプレート生成エラー:', error)
    return NextResponse.json(
      { error: 'CSVテンプレートの生成に失敗しました' },
      { status: 500 }
    )
  }
}
