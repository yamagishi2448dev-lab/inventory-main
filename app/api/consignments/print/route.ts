import { NextRequest, NextResponse } from 'next/server'
import { buildProxyHeaders, buildTargetUrl, invalidJsonResponse, parseRequestJson } from '@/lib/api/legacy-proxy'
import { extractIds, filterPrintItemsByType } from '@/lib/api/legacy-mappers'

async function forwardPrintRequest(request: NextRequest, ids: string) {
  const targetUrl = buildTargetUrl(request, '/api/items/print')
  targetUrl.searchParams.set('ids', ids)

  const response = await fetch(targetUrl, {
    method: 'GET',
    headers: buildProxyHeaders(request),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    return NextResponse.json(payload, { status: response.status })
  }

  return NextResponse.json(filterPrintItemsByType(payload, 'consignments', 'CONSIGNMENT'), { status: response.status })
}

// GET /api/consignments/print
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const ids = searchParams.get('ids') || searchParams.get('consignmentIds') || ''
  return forwardPrintRequest(request, ids)
}

// POST /api/consignments/print (compat: { consignmentIds })
export async function POST(request: NextRequest) {
  const body = await parseRequestJson(request)
  if (body === null) {
    return invalidJsonResponse()
  }

  const ids = extractIds(body, ['consignmentIds', 'ids']).join(',')
  return forwardPrintRequest(request, ids)
}
