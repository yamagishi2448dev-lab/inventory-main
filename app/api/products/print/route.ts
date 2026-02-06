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

function mapProductsPrintResponse(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const data = payload as Record<string, unknown>
  if (!Array.isArray(data.items)) {
    return payload
  }

  const products = data.items.filter((item) => {
    if (!item || typeof item !== 'object') {
      return false
    }
    const itemType = (item as { itemType?: unknown }).itemType
    return typeof itemType !== 'string' || itemType.toUpperCase() === 'PRODUCT'
  })

  return { products }
}

async function forwardPrintRequest(request: NextRequest, ids: string) {
  const newUrl = new URL('/api/items/print', request.url)
  newUrl.searchParams.set('ids', ids)

  const response = await fetch(newUrl, {
    method: 'GET',
    headers: buildProxyHeaders(request),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status })
  }

  return NextResponse.json(mapProductsPrintResponse(payload), { status: response.status })
}

// GET /api/products/print
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('ids') || searchParams.get('productIds') || ''
  return forwardPrintRequest(request, ids)
}

// POST /api/products/print (compat: { productIds })
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const rawIds =
    (Array.isArray(data.productIds) ? data.productIds : undefined) ||
    (Array.isArray(data.ids) ? data.ids : undefined) ||
    []
  const ids = rawIds.filter((id): id is string => typeof id === 'string').join(',')

  return forwardPrintRequest(request, ids)
}
