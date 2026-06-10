/**
 * Server-side proxy → Exploration API (:8643)
 *
 * All requests from the browser hit /api/explore/* and get forwarded
 * to the Exploration API running on localhost:8643.
 *
 * This keeps the backend connection server-side so the frontend
 * works regardless of how the user accesses it (SSH tunnel, VPN, etc.)
 */

import { NextRequest } from 'next/server'

const EXPLORE_API = process.env.EXPLORE_API_URL || 'http://localhost:8643'

async function proxy(request: NextRequest, path: string[]) {
  const targetPath = '/' + path.join('/')
  const search = request.nextUrl.search || ''
  const targetUrl = `${EXPLORE_API}${targetPath}${search}`

  // Build headers to forward (skip hop-by-hop headers)
  const headers = new Headers()
  const skipHeaders = new Set(['host', 'connection', 'x-forwarded-for', 'x-forwarded-proto'])
  request.headers.forEach((value, key) => {
    if (!skipHeaders.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })

  // Read body for methods that have one
  let body: ArrayBuffer | undefined
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    body = await request.arrayBuffer()
  }

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body,
  })

  const contentType = upstream.headers.get('content-type') || ''

  // --- SSE streaming ---
  if (contentType.includes('text/event-stream')) {
    const encoder = new TextEncoder()
    const reader = upstream.body?.getReader()
    if (!reader) {
      return new Response('No upstream body', { status: 502 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // --- Regular (JSON, etc.) ---
  const bodyArray = await upstream.arrayBuffer()
  const respHeaders = new Headers()
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (!['content-encoding', 'transfer-encoding'].includes(lower)) {
      respHeaders.set(key, value)
    }
  })

  return new Response(bodyArray, {
    status: upstream.status,
    headers: respHeaders,
  })
}

// --- HTTP method handlers ---

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, (await params).path)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, (await params).path)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, (await params).path)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, (await params).path)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(request, (await params).path)
}
