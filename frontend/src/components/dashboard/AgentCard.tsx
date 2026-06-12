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
  Trash2,
  Wifi,
  Clock,
  CalendarDays,
  FileText,
} from "lucide-react"
import { pauseJob, resumeJob, triggerJob } from "@/lib/api"
import { toast } from "sonner"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"

interface AgentCardProps {
  agent: Agent
  progress?: number
  activeTool?: string
  runId?: string | null
  sseConnected?: boolean
  onRunIdChange?: (runId: string | null) => void
  onStatusChange?: (agentId: string, newStatus: string) => void
  onDelete?: (agentId: string) => Promise<void>
  index?: number
}

const statusBorderColors: Record<string, string> = {
  active: "border-l-success",
  paused: "border-l-warning",
  error: "border-l-error",
}

function getTemplateLabel(template?: string): string {
  if (!template) return "General"
  const t = template.toLowerCase()
  if (t.includes("research") || t.includes("search")) return "Investigación"
  if (t.includes("code") || t.includes("dev")) return "Desarrollo"
  if (t.includes("data") || t.includes("analytics")) return "Análisis"
  if (t.includes("write") || t.includes("content")) return "Contenido"
  if (t.includes("monitor") || t.includes("watch")) return "Monitoreo"
  if (t.includes("test") || t.includes("qa")) return "Testing"
  if (t.includes("deploy") || t.includes("ops")) return "Operaciones"
  return template
}

export function AgentCard({ agent, progress, activeTool, runId, sseConnected, onRunIdChange, onStatusChange, onDelete, index = 0 }: AgentCardProps) {
  const isRunning = agent.status === "running"
  const hasProgress = progress !== undefined && progress !== null
  const progressPercent = hasProgress ? Math.round(progress * 100) : 0
  const [loading, setLoading] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
      onStatusChange?.(agent.id, "running")
      toast.success(`${agent.name} en ejecución`)
    } catch (err) {
      console.error("Trigger failed:", err)
      toast.error("Error al ejecutar " + agent.name)
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!onDelete || deleting) return
    try {
      setDeleting(true)
      await onDelete(agent.id)
      setDeleteOpen(false)
    } catch {
      // toast handled by parent
    } finally {
      setDeleting(false)
    }
  }

  const templateLabel = getTemplateLabel(agent.template)

  return (
    <AnimateIn delay={index * 60} direction="up" duration={300}>
      <Card
        className={cn(
          "overflow-hidden flex flex-col transition-all duration-200",
          "border-l-2 border-l-muted",
          isRunning && "border-l-primary/70 shadow-sm",
          !isRunning && agent.status === "active" && "border-l-success",
          agent.status === "paused" && "border-l-warning",
          agent.status === "error" && "border-l-error",
          "hover:shadow-sm hover:-translate-y-0.5",
        )}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md flex items-center justify-center text-base shrink-0 bg-muted/50 border border-border/60">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-tight truncate text-foreground">
                  {agent.name}
                </h3>
                <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded border border-border/60 bg-muted/30 text-muted-foreground font-mono">
                  {templateLabel}
                </span>
                {agent.profile && (
                  <p className="mt-1 text-[10px] text-muted-foreground/70 truncate font-mono" title={agent.profile}>
                    @{agent.profile}
                  </p>
                )}
              </div>
            </div>
            <StatusBadge status={agent.status} />
          </div>
        </div>

        {/* Content */}
        <CardContent className="flex-1 px-4 space-y-3">
          {/* Schedule info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Próxima</p>
                <p className="font-medium text-xs text-foreground truncate font-mono">{agent.nextRun || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Última</p>
                <p className="font-medium text-xs text-foreground truncate font-mono">{agent.lastRun || "—"}</p>
              </div>
            </div>
          </div>

          {/* Running banner */}
          {isRunning && (
            <div className="space-y-1.5 rounded-md border border-primary/15 bg-primary/3 p-3">
              <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-primary">
                  <Wifi className="h-3 w-3 animate-pulse" />
                  Ejecutando
                </span>
                <span className="text-muted-foreground font-mono">
                  {hasProgress ? `${progressPercent}%` : sseConnected ? "en vivo" : "sincronizando…"}
                </span>
              </div>
              {hasProgress ? (
                <Progress
                  value={progressPercent}
                  className="h-1 **:data-[slot=progress-indicator]:bg-primary"
                />
              ) : (
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full w-1/3 rounded-full bg-primary/60 animate-pulse" />
                </div>
              )}
            </div>
          )}

          {/* Progress when not running */}
          {!isRunning && hasProgress && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Wifi className="h-3 w-3 text-primary animate-pulse" />
                  Progreso
                </span>
                <span className="text-foreground font-mono">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1" />
            </div>
          )}

          {/* Tool indicator */}
          {activeTool && (
            <ToolIndicator
              toolType={activeTool}
              isExecuting={isRunning}
            />
          )}

          {runId && sseConnected && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-mono">
              <Wifi className="h-3 w-3 text-success" />
              <span>SSE activo</span>
            </div>
          )}

          {/* Last output preview */}
          {agent.config?.last_output && (
            <div className="rounded-md border border-border/40 bg-muted/20 p-3">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
                Último resultado
              </p>
              <p className="text-xs text-muted-foreground/70 line-clamp-2 overflow-hidden leading-relaxed">
                {agent.config.last_output}
                <span className="absolute bottom-0 left-0 right-0 h-3 bg-linear-to-t from-muted/20 to-transparent pointer-events-none" />
              </p>
            </div>
          )}
        </CardContent>

        {/* Footer actions */}
        <CardFooter className="px-4 py-2.5 border-t border-border/40 bg-muted/10">
          <div className="flex items-center gap-1.5 w-full justify-between">
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="icon"
                title={agent.status === "active" ? "Pausar" : "Reanudar"}
                onClick={handlePauseResume}
                disabled={!!loading || isRunning}
                className="h-8 w-8"
              >
                {(agent.status === "active" || agent.status === "running") ? (
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
                disabled={!!loading || isRunning}
                className="h-8 w-8 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/30"
              >
                {loading === "trigger" ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title="Eliminar agente"
              onClick={() => setDeleteOpen(true)}
              disabled={!!loading || isRunning || !onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Eliminar ${agent.name}?`}
        description={
          agent.profile
            ? `Se eliminará el cron job y el profile "${agent.profile}" asociado. Esta acción no se puede deshacer.`
            : "Se eliminará el cron job. Esta acción no se puede deshacer."
        }
        loading={deleting}
        onConfirm={handleDelete}
      />
    </AnimateIn>
  )
}
