import { NextRequest, NextResponse } from 'next/server'

// v3.0: Products APIはItems APIへリダイレクト
// 後方互換性のため維持

// GET /api/products -> /api/items?type=product
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const newUrl = new URL('/api/items', request.url)
  newUrl.searchParams.set('type', 'product')

  // 既存のクエリパラメータをコピー
  searchParams.forEach((value, key) => {
    newUrl.searchParams.set(key, value)
  })

  return NextResponse.redirect(newUrl, { status: 307 })
}

// POST /api/products -> /api/items (itemType=PRODUCT)
// 注: POSTリクエストはリダイレクトできないため、直接Items APIを呼び出す
export async function POST(request: NextRequest) {
  // Items APIへのプロキシ
  const newUrl = new URL('/api/items', request.url)
  return NextResponse.redirect(newUrl, { status: 307 })
}
