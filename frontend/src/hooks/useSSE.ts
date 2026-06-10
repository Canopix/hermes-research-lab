import { useRef, useCallback, useEffect, useState } from 'react'

// --- Types ---

export interface SSEEvent {
  type: 'token' | 'tool_start' | 'tool_end' | 'lifecycle' | 'error'
  data: any
  timestamp: string
}

export type SSEEventType = SSEEvent['type']

export interface UseSSEReturn {
  isConnected: boolean
  error: string | null
  reconnect: () => void
  lastEvent: SSEEvent | null
}

// --- Constants ---

const INITIAL_RETRY_DELAY = 2_000       // 2s
const MAX_RETRY_DELAY = 60_000           // 60s
const RETRY_BACKOFF_FACTOR = 2
const MAX_RETRY_ATTEMPTS = 5             // stop after 5 failures
const POLLING_INTERVAL = 10_000          // 10s fallback polling
const CONNECTION_TIMEOUT = 8_000         // 8s timeout for SSE open

// --- Helpers ---

function buildSSEUrl(baseUrl: string, runId: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}/api/jobs/${runId}/events${separator}encoding=json`
}

// --- Hook ---

export function useSSE(
  baseUrl: string,
  runId: string | null,
  onEvent: (event: SSEEvent) => void,
  enabled: boolean = true,
): UseSSEReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onEventRef = useRef(onEvent)
  const stoppedRef = useRef(false)

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    retryCountRef.current = 0
    setIsConnected(false)
  }, [])

  const startSSE = useCallback(() => {
    if (!runId || stoppedRef.current) return

    const url = buildSSEUrl(baseUrl, runId)

    cleanup()

    try {
      const es = new EventSource(url)
      eventSourceRef.current = es

      // Connection timeout — if SSE doesn't open in time, treat as failure
      timeoutRef.current = setTimeout(() => {
        if (es.readyState !== EventSource.OPEN) {
          es.close()
          eventSourceRef.current = null
          retryConnection()
        }
      }, CONNECTION_TIMEOUT)

      es.onopen = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        setIsConnected(true)
        setError(null)
        retryCountRef.current = 0
      }

      const handleMessage = (type: SSEEvent['type']) => (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data)
          const event: SSEEvent = {
            type,
            data: parsed,
            timestamp: new Date().toISOString(),
          }
          setLastEvent(event)
          onEventRef.current(event)
        } catch {
          // ignore parse errors
        }
      }

      es.addEventListener('token', handleMessage('token'))
      es.addEventListener('tool_start', handleMessage('tool_start'))
      es.addEventListener('tool_end', handleMessage('tool_end'))
      es.addEventListener('lifecycle', handleMessage('lifecycle'))

      es.onerror = () => {
        setIsConnected(false)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        if (es.readyState === EventSource.CLOSED) return
        retryConnection()
      }
    } catch (err) {
      setError(`Failed to connect SSE: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [baseUrl, runId, cleanup])

  const retryConnection = useCallback(() => {
    if (stoppedRef.current) return

    // Stop retrying after max attempts
    if (retryCountRef.current >= MAX_RETRY_ATTEMPTS) {
      setError('SSE connection failed — max retries reached')
      // Start polling as final fallback
      startPolling()
      return
    }

    const delayMs = Math.min(
      INITIAL_RETRY_DELAY * Math.pow(RETRY_BACKOFF_FACTOR, retryCountRef.current),
      MAX_RETRY_DELAY,
    )
    retryCountRef.current += 1

    retryTimeoutRef.current = setTimeout(() => {
      if (!stoppedRef.current) {
        startSSE()
      }
    }, delayMs)
  }, [startSSE])

  // Polling fallback — only as last resort, not simultaneous with SSE
  const startPolling = useCallback(() => {
    if (!runId || pollingRef.current) return
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'agenthub-local'

    const fetchStatus = async () => {
      if (stoppedRef.current) return
      try {
        const res = await fetch(`${baseUrl}/api/jobs/${runId}/run`, {
          headers: { 'Authorization': `Bearer ${API_KEY}` },
          signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) return
        const data = await res.json()
        const event: SSEEvent = {
          type: 'lifecycle',
          data: { status: data.status, progress: data.progress ?? null },
          timestamp: new Date().toISOString(),
        }
        onEventRef.current(event)
      } catch {
        // polling failed silently
      }
    }

    fetchStatus()
    pollingRef.current = setInterval(fetchStatus, POLLING_INTERVAL)
  }, [baseUrl, runId])

  useEffect(() => {
    if (!enabled || !runId) {
      cleanup()
      return
    }

    stoppedRef.current = false
    startSSE()

    return () => {
      stoppedRef.current = true
      cleanup()
    }
  }, [runId, enabled])

  const reconnect = useCallback(() => {
    retryCountRef.current = 0
    setError(null)
    stoppedRef.current = false
    startSSE()
  }, [startSSE])

  return { isConnected, error, reconnect, lastEvent }
}
