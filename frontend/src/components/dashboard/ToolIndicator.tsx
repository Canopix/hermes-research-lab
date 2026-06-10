import { cn } from '@/lib/utils'
import {
  Search,
  FileText,
  Code,
  Globe,
  Terminal,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

// Map tool names to display info
const TOOL_MAP: Record<string, { icon: React.ReactNode; label: string }> = {
  web_search: { icon: <Search className="h-4 w-4" />, label: 'Web Search' },
  search: { icon: <Search className="h-4 w-4" />, label: 'Search' },
  write_file: { icon: <FileText className="h-4 w-4" />, label: 'Write File' },
  read_file: { icon: <FileText className="h-4 w-4" />, label: 'Read File' },
  code_execution: { icon: <Code className="h-4 w-4" />, label: 'Code Execution' },
  execute_code: { icon: <Code className="h-4 w-4" />, label: 'Execute Code' },
  browser: { icon: <Globe className="h-4 w-4" />, label: 'Browser' },
  terminal: { icon: <Terminal className="h-4 w-4" />, label: 'Terminal' },
  default: { icon: <Terminal className="h-4 w-4" />, label: 'Tool' },
}

function getToolInfo(toolType: string) {
  const key = toolType.toLowerCase()
  return TOOL_MAP[key] ?? TOOL_MAP.default
}

interface ToolIndicatorProps {
  toolType: string
  isExecuting?: boolean
  resultCount?: number
  query?: string
}

export function ToolIndicator({ toolType, isExecuting = false, resultCount, query }: ToolIndicatorProps) {
  const { icon, label } = getToolInfo(toolType)

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors',
        isExecuting
          ? 'border-primary/20 bg-primary/5'
          : 'border-muted bg-muted/30',
      )}
    >
      <div className={cn(
        'shrink-0',
        isExecuting && 'animate-spin',
      )}>
        {isExecuting ? (
          <Loader2 className="h-4 w-4 text-primary" />
        ) : resultCount !== undefined ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          icon
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium">{label}</span>
          {isExecuting && (
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider animate-pulse">
              Running
            </span>
          )}
        </div>

        {query && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {query}
          </p>
        )}

        {resultCount !== undefined && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  )
}
