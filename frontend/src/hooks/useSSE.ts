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

const INITIAL_RETRY_DELAY = 1_000       // 1s
const MAX_RETRY_DELAY = 30_000           // 30s
const RETRY_BACKOFF_FACTOR = 2
const POLLING_INTERVAL = 5_000           // 5s fallback polling

// --- Helpers ---

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function buildSSEUrl(baseUrl: string, runId: string): string {
  const separator = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}/v1/runs/${runId}/events${separator}encoding=json`
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
  const onEventRef = useRef(onEvent)

  // Keep callback ref in sync
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const stopConnection = useCallback(() => {
    // Close EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    // Stop polling fallback
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    retryCountRef.current = 0
    setIsConnected(false)
  }, [])

  const startSSE = useCallback(() => {
    if (!runId) return

    const url = buildSSEUrl(baseUrl, runId)

    // Close any existing connection first
    stopConnection()

    try {
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onopen = () => {
        setIsConnected(true)
        setError(null)
        retryCountRef.current = 0
      }

      es.addEventListener('token', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data)
          const event: SSEEvent = {
            type: 'token',
            data: parsed,
            timestamp: new Date().toISOString(),
          }
          setLastEvent(event)
          onEventRef.current(event)
        } catch {
          // ignore parse errors
        }
      })

      es.addEventListener('tool_start', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data)
          const event: SSEEvent = {
            type: 'tool_start',
            data: parsed,
            timestamp: new Date().toISOString(),
          }
          setLastEvent(event)
          onEventRef.current(event)
        } catch {
          // ignore parse errors
        }
      })

      es.addEventListener('tool_end', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data)
          const event: SSEEvent = {
            type: 'tool_end',
            data: parsed,
            timestamp: new Date().toISOString(),
          }
          setLastEvent(event)
          onEventRef.current(event)
        } catch {
          // ignore parse errors
        }
      })

      es.addEventListener('lifecycle', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data)
          const event: SSEEvent = {
            type: 'lifecycle',
            data: parsed,
            timestamp: new Date().toISOString(),
          }
          setLastEvent(event)
          onEventRef.current(event)
        } catch {
          // ignore parse errors
        }
      })

      es.onerror = async () => {
        setIsConnected(false)

        // If the connection is explicitly closed (not an error), don't retry
        if (es.readyState === EventSource.CLOSED) return

        setError('SSE connection lost — attempting to reconnect')

        // Exponential backoff: 1s -> 2s -> 4s -> 8s -> 16s -> 30s (max)
        const delayMs = Math.min(
          INITIAL_RETRY_DELAY * Math.pow(RETRY_BACKOFF_FACTOR, retryCountRef.current),
          MAX_RETRY_DELAY,
        )
        retryCountRef.current += 1

        retryTimeoutRef.current = setTimeout(() => {
          startSSE()
        }, delayMs)
      }
    } catch (err) {
      setError(`Failed to connect SSE: ${err instanceof Error ? err.message : String(err)}`)
    }
  }, [baseUrl, runId, stopConnection])

  // Fallback polling: query /v1/runs/{id} every 5s when SSE is unavailable
  const startPolling = useCallback(() => {
    if (!runId) return

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${baseUrl}/v1/runs/${runId}`, {
          headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY || 'agenthub-local'}` },
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

    fetchStatus() // immediate first poll
    pollingRef.current = setInterval(fetchStatus, POLLING_INTERVAL)
  }, [baseUrl, runId])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // Main effect: manage SSE lifecycle
  useEffect(() => {
    if (!enabled || !runId) {
      stopConnection()
      stopPolling()
      return
    }

    // Try SSE first; if it fails, fall back to polling
    startSSE()

    // Start polling as a backup (it won't fire events if SSE succeeds,
    // but provides a safety net if SSE drops)
    startPolling()

    return () => {
      stopConnection()
      stopPolling()
    }
  }, [runId, enabled, startSSE, startPolling, stopConnection, stopPolling])

  // Expose reconnect function
  const reconnect = useCallback(() => {
    retryCountRef.current = 0
    setError(null)
    startSSE()
  }, [startSSE])

  return { isConnected, error, reconnect, lastEvent }
}
