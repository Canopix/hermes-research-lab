import { Agent } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { StatusBadge } from "./StatusBadge"
import { Progress } from "@/components/ui/progress"
import { ToolIndicator } from "./ToolIndicator"
import { cn } from "@/lib/utils"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  MoreVertical, 
  Terminal,
  Wifi,
  WifiOff,
} from "lucide-react"

interface AgentCardProps {
  agent: Agent
  progress?: number
  activeTool?: string
  runId?: string | null
  onRunIdChange?: (runId: string | null) => void
}

export function AgentCard({ agent, progress, activeTool, runId, onRunIdChange }: AgentCardProps) {
  const isRunning = agent.status === 'active'
  const hasProgress = progress !== undefined && progress !== null
  const progressPercent = hasProgress ? Math.round(progress * 100) : 0

  return (
    <Card className={cn(
      "overflow-hidden flex flex-col transition-all",
      isRunning && "ring-1 ring-primary/20",
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center",
              isRunning
                ? "bg-primary/10 animate-pulse"
                : "bg-primary/10",
            )}>
              <Terminal className={cn(
                "h-6 w-6",
                isRunning ? "text-primary" : "text-muted-foreground",
              )} />
            </div>
            <div>
              <h3 className="font-semibold leading-none">{agent.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{agent.template}</p>
            </div>
          </div>
          <StatusBadge status={agent.status} />
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Next Run</p>
            <p className="font-medium">{agent.nextRun || "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Last Run</p>
            <p className="font-medium">{agent.lastRun || "N/A"}</p>
          </div>
        </div>

        {/* Animated progress bar for running agents */}
        {isRunning && hasProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
              <span className="flex items-center gap-1">
                <Wifi className="h-3 w-3 text-primary animate-pulse" />
                Progress
              </span>
              <span>{progressPercent}%</span>
            </div>
            <Progress
              value={progressPercent}
              className="h-1.5"
            />
          </div>
        )}

        {/* Shimmer progress for running agents without specific progress */}
        {isRunning && !hasProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
              <span className="flex items-center gap-1">
                <Wifi className="h-3 w-3 text-primary animate-pulse" />
                Running
              </span>
              <span className="animate-pulse">--</span>
            </div>
            <Progress value={0} className="h-1.5" />
          </div>
        )}

        {/* Active tool indicator */}
        {activeTool && (
          <ToolIndicator
            toolType={activeTool}
            isExecuting={isRunning}
          />
        )}

        {/* Connection status */}
        {runId && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Wifi className="h-3 w-3 text-emerald-500" />
            <span>SSE streaming active</span>
            <span className="font-mono">{runId.slice(0, 8)}</span>
          </div>
        )}

        <div className="bg-muted/50 rounded-md p-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Last Output Preview</p>
          <p className="text-xs line-clamp-3 font-mono">
            {agent.config?.last_output || "No output recorded yet."}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t bg-muted/20 pt-3">
        <div className="flex gap-1">
          <Button variant="outline" size="icon" title="Pause/Resume">
            {agent.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" title="Trigger Now">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
