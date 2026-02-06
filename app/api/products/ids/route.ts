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

function mapProductIdsResponse(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const data = payload as Record<string, unknown>
  if (!Array.isArray(data.ids)) {
    return payload
  }

  return {
    productIds: data.ids,
  }
}

// GET /api/products/ids -> /api/items/ids?type=product (compat: { productIds })
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const newUrl = new URL('/api/items/ids', request.url)
  newUrl.searchParams.set('type', 'product')
  searchParams.forEach((value, key) => newUrl.searchParams.set(key, value))

  const response = await fetch(newUrl, {
    method: 'GET',
    headers: buildProxyHeaders(request),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status })
  }

  return NextResponse.json(mapProductIdsResponse(payload), { status: response.status })
}
