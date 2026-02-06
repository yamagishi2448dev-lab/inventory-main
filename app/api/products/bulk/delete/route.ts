import { NextRequest, NextResponse } from 'next/server'

// v3.0: リダイレクト
export async function POST(request: NextRequest) {
  const newUrl = new URL('/api/items/bulk/delete', request.url)
  return NextResponse.rewrite(newUrl)
}
