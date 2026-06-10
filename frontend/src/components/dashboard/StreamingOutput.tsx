import { useRef, useEffect, useState, useCallback } from 'react'
import { useSSE, SSEEvent } from '@/hooks/useSSE'
import { ToolIndicator } from './ToolIndicator'
import { cn } from '@/lib/utils'
import {
  Terminal,
  Loader2,
  AlertCircle,
  Play,
  Square,
  RefreshCw,
} from 'lucide-react'

// Scrollable terminal-like output area
interface StreamingOutputProps {
  baseUrl: string
  runId: string | null
  className?: string
  autoScroll?: boolean
}

export function StreamingOutput({ baseUrl, runId, className, autoScroll = true }: StreamingOutputProps) {
  const [textChunks, setTextChunks] = useState<string[]>([])
  const [toolHistory, setToolHistory] = useState<SSEEvent[]>([])
  const [currentTool, setCurrentTool] = useState<SSEEvent | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [sseError, setSseError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [textChunks, toolHistory, autoScroll])

  const handleEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case 'token': {
        const text = event.data?.text ?? ''
        if (text) {
          setTextChunks(prev => [...prev, text])
        }
        break
      }
      case 'tool_start': {
        const toolEvent: SSEEvent = {
          type: 'tool_start',
          data: event.data,
          timestamp: event.timestamp,
        }
        setToolHistory(prev => [...prev, toolEvent])
        setCurrentTool(toolEvent)
        break
      }
      case 'tool_end': {
        setToolHistory(prev => {
          const updated = [...prev]
          // Mark the current tool as ended
          if (currentTool) {
            updated[updated.length - 1] = {
              ...currentTool,
              data: {
                ...currentTool.data,
                ended: true,
                result: event.data,
              },
            }
          }
          return updated
        })
        setCurrentTool(null)
        break
      }
      case 'lifecycle': {
        const status = event.data?.status
        const progress = event.data?.progress
        if (status) {
          setIsRunning(status === 'running' || status === 'running_agent')
          if (status === 'completed' || status === 'error' || status === 'cancelled') {
            setIsRunning(false)
          }
        }
        if (progress !== undefined) {
          // Could emit progress via a callback if needed
        }
        break
      }
      case 'error': {
        setSseError(event.data?.message ?? 'Unknown error')
        setIsRunning(false)
        break
      }
    }
  }, [currentTool])

  // Use the SSE hook
  const sse = useSSE(baseUrl, runId, handleEvent, !!runId)

  // Expose connection state to parent via callbacks
  useEffect(() => {
    setIsConnected(sse.isConnected)
    setSseError(sse.error)
  }, [sse.isConnected, sse.error])

  // Clear state on reset
  const reset = useCallback(() => {
    setTextChunks([])
    setToolHistory([])
    setCurrentTool(null)
    setIsRunning(false)
    setSseError(null)
  }, [])

  return (
    <div className={cn('flex flex-col rounded-lg border bg-card', className)}>
      {/* Header bar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Live Output</span>
          {runId && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {runId.slice(0, 8)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status */}
          {sseError && (
            <div className="flex items-center gap-1 text-[10px] text-red-500">
              <AlertCircle className="h-3 w-3" />
              <span>{sseError}</span>
            </div>
          )}
          {!sseError && !isConnected && runId && (
            <div className="flex items-center gap-1 text-[10px] text-amber-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Connecting...</span>
            </div>
          )}
          {!sseError && isConnected && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-500">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </div>
          )}

          {/* Controls */}
          <button
            onClick={sse.reconnect}
            className="p-1 rounded hover:bg-muted"
            title="Reconnect"
            disabled={!runId}
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Tool progress area */}
      {(currentTool || toolHistory.length > 0) && (
        <div className="border-b px-4 py-2 space-y-1.5 bg-muted/20">
          {currentTool && (
            <ToolIndicator
              toolType={currentTool.data?.tool ?? 'unknown'}
              isExecuting={true}
              query={currentTool.data?.query}
            />
          )}
          {toolHistory.filter(t => !t.data?.ended).slice(-2).map((t, i) => (
            <ToolIndicator
              key={i}
              toolType={t.data?.tool ?? 'unknown'}
              isExecuting={false}
              resultCount={t.data?.result?.result_count}
            />
          ))}
        </div>
      )}

      {/* Streaming text output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-sm min-h-[200px] max-h-[600px]"
      >
        {textChunks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 py-12">
            <Play className="h-8 w-8 opacity-30" />
            <p className="text-xs">
              {isRunning
                ? 'Waiting for output...'
                : runId
                  ? 'Start the agent to see live output'
                  : 'No run selected'}
            </p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words leading-relaxed">
            {textChunks.join('')}
            {isRunning && (
              <span className="inline-block w-2 h-4 bg-primary ml-0.5 animate-pulse" />
            )}
          </pre>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {textChunks.length} token chunk{textChunks.length !== 1 ? 's' : ''}
          {toolHistory.length > 0 && ` \u00b7 ${toolHistory.length} tool${toolHistory.length !== 1 ? 's' : ''}`}
        </span>
        <span>
          {isRunning ? 'Running' : sseError ? 'Error' : 'Idle'}
        </span>
      </div>
    </div>
  )
}
