import { NextRequest, NextResponse } from 'next/server'
import { buildProxyHeaders, buildTargetUrl } from '@/lib/api/legacy-proxy'
import { mapIdsToLegacy } from '@/lib/api/legacy-mappers'

// GET /api/products/ids -> /api/items/ids?type=product (compat: { productIds })
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = buildTargetUrl(request, '/api/items/ids')
  targetUrl.searchParams.set('type', 'product')
  searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value))

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: buildProxyHeaders(request),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status })
  }

  return NextResponse.json(mapIdsToLegacy(payload, 'productIds'), { status: response.status })
}
