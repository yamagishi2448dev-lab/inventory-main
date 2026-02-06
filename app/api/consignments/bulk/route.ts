import { NextRequest, NextResponse } from 'next/server'

// v3.0: リダイレクト（一括削除）
export async function POST(request: NextRequest) {
  const newUrl = new URL('/api/items/bulk/delete', request.url)
  return NextResponse.rewrite(newUrl)
}
