import { NextRequest, NextResponse } from 'next/server'

function buildProxyHeaders(request: NextRequest) {
  const headers = new Headers()
  const cookie = request.headers.get('cookie')
  const authorization = request.headers.get('authorization')

  if (cookie) {
    headers.set('cookie', cookie)
  }
  if (authorization) {
    headers.set('authorization', authorization)
  }

  return headers
}

function mapProductListResponse(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const data = payload as Record<string, unknown>
  if (!Array.isArray(data.items)) {
    return payload
  }

  const { items, ...rest } = data
  return {
    products: items,
    ...rest,
  }
}

// GET /api/products -> /api/items?type=product (compat: { products, pagination })
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const newUrl = new URL('/api/items', request.url)
  newUrl.searchParams.set('type', 'product')

  searchParams.forEach((value, key) => {
    newUrl.searchParams.set(key, value)
  })

  const response = await fetch(newUrl, {
    method: 'GET',
    headers: buildProxyHeaders(request),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status })
  }

  return NextResponse.json(mapProductListResponse(payload), { status: response.status })
}

// POST /api/products -> /api/items (itemType=PRODUCT)
export async function POST(request: NextRequest) {
  const newUrl = new URL('/api/items', request.url)
  return NextResponse.redirect(newUrl, { status: 307 })
}
