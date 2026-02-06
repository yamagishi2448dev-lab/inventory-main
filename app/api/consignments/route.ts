import { NextRequest, NextResponse } from 'next/server'

// v3.0: Consignments APIはItems APIへリダイレクト
// 後方互換性のため維持

// GET /api/consignments -> /api/items?type=consignment
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const newUrl = new URL('/api/items', request.url)
  newUrl.searchParams.set('type', 'consignment')

  // 既存のクエリパラメータをコピー
  searchParams.forEach((value, key) => {
    newUrl.searchParams.set(key, value)
  })

  return NextResponse.redirect(newUrl, { status: 307 })
}

// POST /api/consignments -> /api/items (itemType=CONSIGNMENT)
// 注: POSTリクエストはリダイレクトできないため、307で転送
export async function POST(request: NextRequest) {
  const newUrl = new URL('/api/items', request.url)
  return NextResponse.redirect(newUrl, { status: 307 })
}
