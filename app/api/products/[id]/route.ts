import { NextRequest, NextResponse } from 'next/server'

// v3.0: Products APIはItems APIへリダイレクト

// GET /api/products/:id -> /api/items/:id
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const newUrl = new URL(`/api/items/${params.id}`, request.url)
  return NextResponse.redirect(newUrl, { status: 307 })
}

// PUT /api/products/:id -> /api/items/:id
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const newUrl = new URL(`/api/items/${params.id}`, request.url)
  return NextResponse.rewrite(newUrl)
}

// DELETE /api/products/:id -> /api/items/:id
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const newUrl = new URL(`/api/items/${params.id}`, request.url)
  return NextResponse.rewrite(newUrl)
}
