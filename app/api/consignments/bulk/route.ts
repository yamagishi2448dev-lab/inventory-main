import { NextRequest, NextResponse } from 'next/server'
import { extractIds } from '@/lib/api/legacy-mappers'
import { forwardRequest, invalidJsonResponse, parseRequestJson } from '@/lib/api/legacy-proxy'

async function forwardBulkDelete(request: NextRequest, ids: string[]) {
  const { response, payload } = await forwardRequest({
    request,
    targetPath: '/api/items/bulk/delete',
    method: 'POST',
    body: { ids },
    includeJsonContentType: true,
  })

  return NextResponse.json(payload, { status: response.status })
}

// DELETE /api/consignments/bulk (legacy method compatibility)
export async function DELETE(request: NextRequest) {
  const body = await parseRequestJson(request)
  if (body === null) {
    return invalidJsonResponse()
  }

  return forwardBulkDelete(request, extractIds(body, ['consignmentIds', 'ids']))
}

// POST /api/consignments/bulk (keep existing compatibility)
export async function POST(request: NextRequest) {
  const body = await parseRequestJson(request)
  if (body === null) {
    return invalidJsonResponse()
  }

  return forwardBulkDelete(request, extractIds(body, ['consignmentIds', 'ids']))
}
