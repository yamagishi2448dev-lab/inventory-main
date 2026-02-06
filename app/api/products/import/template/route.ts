import { NextRequest, NextResponse } from 'next/server'

// v3.0: リダイレクト
export async function GET(request: NextRequest) {
  const newUrl = new URL('/api/items/import/template', request.url)
  return NextResponse.redirect(newUrl, { status: 307 })
}
