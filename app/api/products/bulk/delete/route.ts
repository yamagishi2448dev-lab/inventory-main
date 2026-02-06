import { NextRequest, NextResponse } from 'next/server'

function buildProxyHeaders(request: NextRequest, includeJsonContentType = false) {
  const headers = new Headers()
  const cookie = request.headers.get('cookie')
  const authorization = request.headers.get('authorization')

  if (cookie) {
    headers.set('cookie', cookie)
  }
  if (authorization) {
    headers.set('authorization', authorization)
  }
  if (includeJsonContentType) {
    headers.set('content-type', 'application/json')
  }

  return headers
}

function extractIds(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return []
  }

  const data = payload as Record<string, unknown>
  const rawIds =
    (Array.isArray(data.productIds) ? data.productIds : undefined) ||
    (Array.isArray(data.ids) ? data.ids : undefined) ||
    []

  return rawIds.filter((id): id is string => typeof id === 'string')
}

// POST /api/products/bulk/delete
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const response = await fetch(new URL('/api/items/bulk/delete', request.url), {
    method: 'POST',
    headers: buildProxyHeaders(request, true),
    body: JSON.stringify({ ids: extractIds(body) }),
  })

  const payload = await response.json().catch(() => null)
  return NextResponse.json(payload, { status: response.status })
}
