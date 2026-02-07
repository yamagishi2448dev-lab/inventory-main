import { NextRequest, NextResponse } from 'next/server'
import { buildProxyHeaders, buildTargetUrl, forwardRequest } from '@/lib/api/legacy-proxy'
import { mapItemsToLegacyList } from '@/lib/api/legacy-mappers'

// GET /api/products -> /api/items?type=product (compat: { products, pagination })
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = buildTargetUrl(request, '/api/items')
  targetUrl.searchParams.set('type', 'product')

  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value)
  })

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: buildProxyHeaders(request),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status })
  }

  return NextResponse.json(mapItemsToLegacyList(payload, 'products'), { status: response.status })
}

// POST /api/products -> /api/items (itemType=PRODUCT)
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const requestBody =
    body && typeof body === 'object'
      ? { ...(body as Record<string, unknown>), itemType: 'PRODUCT' }
      : { itemType: 'PRODUCT' }

  const { response, payload } = await forwardRequest({
    request,
    targetPath: '/api/items',
    method: 'POST',
    body: requestBody,
    includeJsonContentType: true,
  })

  return NextResponse.json(payload, { status: response.status })
}
