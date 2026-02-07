import { NextRequest, NextResponse } from 'next/server'
import { extractIds } from '@/lib/api/legacy-mappers'
import { forwardRequest, invalidJsonResponse, parseRequestJson } from '@/lib/api/legacy-proxy'

// POST /api/products/bulk/delete
export async function POST(request: NextRequest) {
  const body = await parseRequestJson(request)
  if (body === null) {
    return invalidJsonResponse()
  }

  const ids = extractIds(body, ['productIds', 'ids'])

  const { response, payload } = await forwardRequest({
    request,
    targetPath: '/api/items/bulk/delete',
    method: 'POST',
    body: { ids },
    includeJsonContentType: true,
  })

  return NextResponse.json(payload, { status: response.status })
}
