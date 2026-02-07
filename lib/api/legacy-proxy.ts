import { NextRequest, NextResponse } from 'next/server'

interface BuildProxyHeadersOptions {
  includeJsonContentType?: boolean
}

export function buildProxyHeaders(
  request: NextRequest,
  options: BuildProxyHeadersOptions = {}
): Headers {
  const headers = new Headers()
  const cookie = request.headers.get('cookie')
  const authorization = request.headers.get('authorization')

  if (cookie) {
    headers.set('cookie', cookie)
  }
  if (authorization) {
    headers.set('authorization', authorization)
  }
  if (options.includeJsonContentType) {
    headers.set('content-type', 'application/json')
  }

  return headers
}

export function buildTargetUrl(request: NextRequest, path: string): URL {
  return new URL(path, request.url)
}

export async function readJsonSafely(response: Response): Promise<unknown> {
  return response.json().catch(() => null)
}

export function invalidJsonResponse() {
  return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
}

export async function parseRequestJson(request: NextRequest): Promise<unknown | null> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

interface ForwardRequestOptions {
  request: NextRequest
  targetPath: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  includeJsonContentType?: boolean
}

export async function forwardRequest({
  request,
  targetPath,
  method,
  body,
  includeJsonContentType = false,
}: ForwardRequestOptions): Promise<{ response: Response; payload: unknown }> {
  const response = await fetch(buildTargetUrl(request, targetPath), {
    method,
    headers: buildProxyHeaders(request, { includeJsonContentType }),
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload = await readJsonSafely(response)
  return { response, payload }
}
