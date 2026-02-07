import { NextRequest, NextResponse } from 'next/server'
import { normalizeBulkEditPayload } from '@/lib/api/legacy-mappers'
import { forwardRequest, invalidJsonResponse, parseRequestJson } from '@/lib/api/legacy-proxy'

// POST /api/products/bulk/edit
export async function POST(request: NextRequest) {
  const body = await parseRequestJson(request)
  if (body === null) {
    return invalidJsonResponse()
  }

  const normalized = normalizeBulkEditPayload(body, 'productIds')

  const { response, payload } = await forwardRequest({
    request,
    targetPath: '/api/items/bulk/edit',
    method: 'POST',
    body: normalized,
    includeJsonContentType: true,
  })

  return NextResponse.json(payload, { status: response.status })
}
