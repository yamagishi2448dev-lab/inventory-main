import { NextRequest, NextResponse } from 'next/server'
import { buildProxyHeaders, buildTargetUrl, forwardRequest, invalidJsonResponse, parseRequestJson } from '@/lib/api/legacy-proxy'
import { mapItemToLegacyEntity, mapItemsToLegacyList } from '@/lib/api/legacy-mappers'

// GET /api/consignments -> /api/items?type=consignment (compat: { consignments, pagination })
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const targetUrl = buildTargetUrl(request, '/api/items')
  targetUrl.searchParams.set('type', 'consignment')

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

  return NextResponse.json(mapItemsToLegacyList(payload, 'consignments'), { status: response.status })
}

// POST /api/consignments -> /api/items (itemType=CONSIGNMENT)
export async function POST(request: NextRequest) {
  const body = await parseRequestJson(request)
  if (body === null) {
    return invalidJsonResponse()
  }

  const requestBody =
    body && typeof body === 'object'
      ? { ...(body as Record<string, unknown>), itemType: 'CONSIGNMENT' }
      : { itemType: 'CONSIGNMENT' }

  const { response, payload } = await forwardRequest({
    request,
    targetPath: '/api/items',
    method: 'POST',
    body: requestBody,
    includeJsonContentType: true,
  })

  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status })
  }

  return NextResponse.json(mapItemToLegacyEntity(payload, 'consignment'), { status: response.status })
}
