import { NextRequest, NextResponse } from 'next/server'

// v3.0: リダイレクト
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const newUrl = new URL('/api/items/export', request.url)
  newUrl.searchParams.set('type', 'product')
  searchParams.forEach((value, key) => newUrl.searchParams.set(key, value))
  return NextResponse.redirect(newUrl, { status: 307 })
}
