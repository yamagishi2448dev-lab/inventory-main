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

function normalizeBulkEditPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return { ids: [], updates: {} }
  }

  const data = payload as Record<string, unknown>
  const rawIds =
    (Array.isArray(data.productIds) ? data.productIds : undefined) ||
    (Array.isArray(data.ids) ? data.ids : undefined) ||
    []
  const ids = rawIds.filter((id): id is string => typeof id === 'string')

  const updates =
    data.updates && typeof data.updates === 'object'
      ? { ...(data.updates as Record<string, unknown>) }
      : {}

  if (updates.quantity && typeof updates.quantity === 'object') {
    const quantity = { ...(updates.quantity as Record<string, unknown>) }
    if (quantity.mode === 'increment') {
      quantity.mode = 'adjust'
    }
    updates.quantity = quantity
  }

  return { ids, updates }
}

// POST /api/products/bulk/edit
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const normalized = normalizeBulkEditPayload(body)
  const response = await fetch(new URL('/api/items/bulk/edit', request.url), {
    method: 'POST',
    headers: buildProxyHeaders(request, true),
    body: JSON.stringify(normalized),
  })

  const payload = await response.json().catch(() => null)
  return NextResponse.json(payload, { status: response.status })
}
