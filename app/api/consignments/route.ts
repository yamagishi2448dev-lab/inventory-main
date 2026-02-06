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

function mapConsignmentListResponse(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const data = payload as Record<string, unknown>
  if (!Array.isArray(data.items)) {
    return payload
  }

  const { items, ...rest } = data
  return {
    consignments: items,
    ...rest,
  }
}

function mapConsignmentCreateResponse(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return payload
  }

  const data = payload as Record<string, unknown>
  if (!('item' in data)) {
    return payload
  }

  const { item, ...rest } = data
  return {
    ...rest,
    consignment: item,
  }
}

// GET /api/consignments -> /api/items?type=consignment (compat: { consignments, pagination })
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const newUrl = new URL('/api/items', request.url)
  newUrl.searchParams.set('type', 'consignment')

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

  return NextResponse.json(mapConsignmentListResponse(payload), { status: response.status })
}

// POST /api/consignments -> /api/items (itemType=CONSIGNMENT)
// compat: body縺ｫitemType縺後↑縺上※繧・itemType=CONSIGNMENT繧定ｨｭ螳壹∝､懃ｴ｢縺ｯ { consignment }
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const requestBody =
    body && typeof body === 'object'
      ? { ...(body as Record<string, unknown>), itemType: 'CONSIGNMENT' }
      : { itemType: 'CONSIGNMENT' }

  const response = await fetch(new URL('/api/items', request.url), {
    method: 'POST',
    headers: buildProxyHeaders(request, true),
    body: JSON.stringify(requestBody),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status })
  }

  return NextResponse.json(mapConsignmentCreateResponse(payload), { status: response.status })
}
