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
  active: "border-l-success",
  paused: "border-l-warning",
  error: "border-l-error",
}

const statusIconColors: Record<string, string> = {
  active: "text-success",
  paused: "text-warning",
  error: "text-error",
}

function getTemplateEmoji(template?: string): string {
  if (!template) return "\u{1F916}"
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
        toast.success(agent.name + " pausado")
        onStatusChange?.(agent.id, "paused")
      } else {
        setLoading("resume")
        await resumeJob(agent.id)
        toast.success(agent.name + " reanudado")
        onStatusChange?.(agent.id, "active")
      }
    } catch (err) {
      console.error("Pause/Resume failed:", err)
      toast.error("Error al " + (agent.status === "active" ? "pausar" : "reanudar") + " " + agent.name)
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
      toast.error("Error al ejecutar " + agent.name)
    } finally {
      setLoading(null)
    }
  }

  const statusIconColor = statusIconColors[agent.status] || "text-muted-foreground"
  const emoji = getTemplateEmoji(agent.template)

  return (
    <AnimateIn delay={index * 80} direction="up" duration={350}>
      <Card
        className={cn(
          "overflow-hidden flex flex-col transition-all duration-200",
          "border-l-[3px] border-l-muted",
          isRunning && "border-l-success",
          agent.status === "paused" && "border-l-warning",
          agent.status === "error" && "border-l-error",
          "hover:shadow-md hover:-translate-y-0.5",
        )}
      >
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-muted/60">
                <span className="select-none">{emoji}</span>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-tight truncate text-foreground">{agent.name}</h3>
                <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {agent.template || "Sin template"}
                </span>
              </div>
            </div>
            <StatusBadge status={agent.status} />
          </div>
        </div>

        <CardContent className="flex-1 px-5 space-y-3">
          {/* Run info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground")} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Próxima Ejecución</p>
                <p className="font-medium text-xs text-foreground truncate">{agent.nextRun || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground")} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Última Ejecución</p>
                <p className="font-medium text-xs text-foreground truncate">{agent.lastRun || "N/A"}</p>
              </div>
            </div>
          </div>

          {/* Progress / Running indicator */}
          {isRunning && hasProgress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Wifi className="h-3 w-3 text-primary animate-pulse" />
                  Progreso
                </span>
                <span className="text-foreground">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}

          {isRunning && !hasProgress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Wifi className="h-3 w-3 text-primary animate-pulse" />
                  Ejecutando
                </span>
                <span className="animate-pulse text-foreground">—</span>
              </div>
              <Progress value={0} className="h-1.5" />
            </div>
          )}

          {/* Tool indicator */}
          {activeTool && (
            <ToolIndicator
              toolType={activeTool}
              isExecuting={isRunning}
            />
          )}

          {/* SSE streaming indicator */}
          {runId && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Wifi className="h-3 w-3 text-success" />
              <span>Streaming SSE activo</span>
              <span className="font-mono text-foreground">{runId.slice(0, 8)}</span>
            </div>
          )}

          {/* Last output preview */}
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Último Output</p>
            <p className="text-xs text-muted-foreground line-clamp-2 overflow-hidden relative leading-relaxed">
              {agent.config?.last_output || "Sin output registrado aún."}
              <span className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-muted/30 to-transparent pointer-events-none" />
            </p>
          </div>
        </CardContent>

        <CardFooter className="px-5 py-3 border-t border-border/40 bg-muted/20">
          <div className="flex items-center gap-1.5 w-full justify-between">
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon"
                title={agent.status === "active" ? "Pausar" : "Reanudar"}
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
                title="Ejecutar"
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Opciones">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </AnimateIn>
  )
}
