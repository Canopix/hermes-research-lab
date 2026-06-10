import { useState } from "react"
import { Agent } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { StatusBadge } from "./StatusBadge"
import { Progress } from "@/components/ui/progress"
import { ToolIndicator } from "./ToolIndicator"
import { cn } from "@/lib/utils"
import { AnimateIn } from "@/components/AnimateIn"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  MoreVertical, 
  Wifi,
  Clock,
  CalendarDays,
} from "lucide-react"
import { pauseJob, resumeJob, triggerJob } from "@/lib/api"
import { toast } from "sonner"

interface AgentCardProps {
  agent: Agent
  progress?: number
  activeTool?: string
  runId?: string | null
  onRunIdChange?: (runId: string | null) => void
  onStatusChange?: (agentId: string, newStatus: string) => void
  index?: number
}

const statusBorderColors: Record<string, string> = {
  active: "border-emerald-500",
  paused: "border-amber-500",
  error: "border-red-500",
}

const statusBgColors: Record<string, string> = {
  active: "bg-emerald-500/10",
  paused: "bg-amber-500/10",
  error: "bg-red-500/10",
}

const statusIconColors: Record<string, string> = {
  active: "text-emerald-500",
  paused: "text-amber-500",
  error: "text-red-500",
}

function getTemplateEmoji(template: string): string {
  const t = template.toLowerCase()
  if (t.includes("code") || t.includes("dev")) return "\u{1F4BB}"
  if (t.includes("data") || t.includes("analytics")) return "\u{1F4CA}"
  if (t.includes("research") || t.includes("search")) return "\u{1F50D}"
  if (t.includes("write") || t.includes("content")) return "\u{270D}\u{FE0F}"
  if (t.includes("image") || t.includes("design")) return "\u{1F3A8}"
  if (t.includes("monitor") || t.includes("watch")) return "\u{1F441}\u{FE0F}"
  if (t.includes("test") || t.includes("qa")) return "\u{1F9EA}"
  if (t.includes("deploy") || t.includes("ops")) return "\u{1F680}"
  return "\u{1F916}"
}

export function AgentCard({ agent, progress, activeTool, runId, onRunIdChange, onStatusChange, index = 0 }: AgentCardProps) {
  const isRunning = agent.status === "active"
  const hasProgress = progress !== undefined && progress !== null
  const progressPercent = hasProgress ? Math.round(progress * 100) : 0
  const [loading, setLoading] = useState<string | null>(null)

  const handlePauseResume = async () => {
    if (loading) return
    try {
      if (agent.status === "active") {
        setLoading("pause")
        await pauseJob(agent.id)
        toast.success(agent.name + " paused")
        onStatusChange?.(agent.id, "paused")
      } else {
        setLoading("resume")
        await resumeJob(agent.id)
        toast.success(agent.name + " resumed")
        onStatusChange?.(agent.id, "active")
      }
    } catch (err) {
      console.error("Pause/Resume failed:", err)
      toast.error("Failed to " + (agent.status === "active" ? "pause" : "resume") + " " + agent.name)
    } finally {
      setLoading(null)
    }
  }

  const handleTrigger = async () => {
    if (loading) return
    try {
      setLoading("trigger")
      await triggerJob(agent.id)
      toast.success("Triggered " + agent.name)
    } catch (err) {
      console.error("Trigger failed:", err)
      toast.error("Failed to trigger " + agent.name)
    } finally {
      setLoading(null)
    }
  }

  const statusBg = statusBgColors[agent.status] || "bg-muted"
  const statusIconColor = statusIconColors[agent.status] || "text-muted-foreground"
  const emoji = getTemplateEmoji(agent.template)

  return (
    <AnimateIn delay={index * 80} direction="up" duration={400}>
      <Card
        className={cn(
          "overflow-hidden flex flex-col transition-all duration-200",
          "border-l-[3px] border-l-transparent",
          isRunning && "border-l-emerald-500",
          agent.status === "paused" && "border-l-amber-500",
          agent.status === "error" && "border-l-red-500",
          "hover:shadow-lg hover:-translate-y-[2px]",
        )}
      >
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0",
                statusBg,
              )}>
                <span className="select-none">{emoji}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-base leading-tight truncate">{agent.name}</h3>
                <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground">
                  {agent.template}
                </span>
              </div>
            </div>
            <StatusBadge status={agent.status} />
          </div>
        </div>

        <CardContent className="flex-1 px-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className={cn("h-3.5 w-3.5 shrink-0", statusIconColor)} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Next Run</p>
                <p className="font-medium text-sm truncate">{agent.nextRun || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className={cn("h-3.5 w-3.5 shrink-0", statusIconColor)} />
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Last Run</p>
                <p className="font-medium text-sm truncate">{agent.lastRun || "N/A"}</p>
              </div>
            </div>
          </div>

          {isRunning && hasProgress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                <span className="flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-primary animate-pulse" />
                  Progress
                </span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}

          {isRunning && !hasProgress && (
            <div className="space-y-1.5">
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

          {activeTool && (
            <ToolIndicator
              toolType={activeTool}
              isExecuting={isRunning}
            />
          )}

          {runId && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Wifi className="h-3 w-3 text-emerald-500" />
              <span>SSE streaming active</span>
              <span className="font-mono">{runId.slice(0, 8)}</span>
            </div>
          )}

          <div className="border border-border/50 rounded-md bg-muted/30 p-3">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Last Output Preview</p>
            <p className="text-xs font-mono text-muted-foreground line-clamp-2 overflow-hidden relative">
              {agent.config?.last_output || "No output recorded yet."}
              <span className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-muted/30 to-transparent pointer-events-none" />
            </p>
          </div>
        </CardContent>

        <CardFooter className="px-5 py-3 border-t border-border/40 bg-muted/10">
          <div className="flex items-center gap-1.5 w-full justify-between">
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon"
                title={agent.status === "active" ? "Pause" : "Resume"}
                onClick={handlePauseResume}
                disabled={!!loading}
                className="h-8 w-8"
              >
                {agent.status === "active" ? (
                  loading === "pause" ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )
                ) : (
                  loading === "resume" ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )
                )}
              </Button>
              <Button
                variant="default"
                size="icon"
                title="Trigger Now"
                onClick={handleTrigger}
                disabled={!!loading}
                className="h-8 w-8"
              >
                {loading === "trigger" ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </AnimateIn>
  )
}
