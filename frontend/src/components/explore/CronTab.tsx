"use client"

import { useCallback, useEffect, useState } from "react"
import { deleteJob, getCronOverview, getJobs } from "@/lib/api"
import { Agent, CronJobInfo } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ClockIcon, Trash2Icon } from "lucide-react"
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog"
import { toast } from "sonner"

export default function CronTab() {
  const [apiJobs, setApiJobs] = useState<Agent[]>([])
  const [configJobs, setConfigJobs] = useState<CronJobInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [jobs, cronConfig] = await Promise.all([
        getJobs(),
        getCronOverview(),
      ])
      setApiJobs(jobs)
      setConfigJobs(cronConfig)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar cron jobs")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDeleteJob = async () => {
    if (!deleteTarget || deleting) return
    try {
      setDeleting(true)
      const result = await deleteJob(deleteTarget.id)
      setApiJobs(prev => prev.filter(j => j.id !== deleteTarget.id))
      if (result.profile_deleted && result.profile) {
        toast.success(`Job eliminado (profile ${result.profile} también)`)
      } else {
        toast.success(`Job "${deleteTarget.name}" eliminado`)
      }
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar job")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Error al cargar cron jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  const groupedByProfile: Record<string, CronJobInfo[]> = {}
  configJobs.forEach((job) => {
    const profile = job.profile || "global"
    if (!groupedByProfile[profile]) groupedByProfile[profile] = []
    groupedByProfile[profile].push(job)
  })

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Agentes programados ({apiJobs.length})
        </h3>
        <p className="text-sm text-muted-foreground">
          Cron jobs gestionados por AgentHub (Hermes API). Puedes eliminarlos aquí.
        </p>

        {apiJobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No hay agentes programados. Crea uno en{" "}
              <a href="/create" className="underline underline-offset-2">Nuevo agente</a>.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {apiJobs.map((job) => (
              <Card key={job.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-medium truncate">
                        {job.name}
                      </CardTitle>
                      <p className="text-[10px] font-mono text-muted-foreground mt-1 truncate">
                        {job.id}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {job.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {job.profile && (
                    <p className="text-xs text-muted-foreground">
                      Profile: <span className="font-mono">{job.profile}</span>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Próxima: {job.nextRun ?? "N/A"}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-1"
                    onClick={() => setDeleteTarget(job)}
                    disabled={job.status === "running"}
                  >
                    <Trash2Icon className="h-3.5 w-3.5 mr-1.5" />
                    Eliminar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {configJobs.length > 0 && (
        <section className="space-y-4">
          <Separator />
          <h3 className="text-lg font-semibold">
            Cron en config.yaml ({configJobs.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Jobs definidos en el config de cada profile. Solo lectura — edítalos en{" "}
            <code className="text-xs bg-muted px-1 rounded">~/.hermes/profiles/*/config.yaml</code>{" "}
            o con <code className="text-xs bg-muted px-1 rounded">hermes cron</code>.
          </p>
          <div className="space-y-4">
            {Object.entries(groupedByProfile).map(([profile, profileJobs]) => (
              <div key={profile}>
                <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                  <Badge variant="outline">{profile}</Badge>
                  <span className="text-muted-foreground">
                    ({profileJobs.length} job{profileJobs.length !== 1 ? "s" : ""})
                  </span>
                </h4>
                <div className="grid gap-3 md:grid-cols-2">
                  {profileJobs.map((job, idx) => {
                    const name = job.name || job.schedule || `Job ${idx + 1}`
                    const schedule = job.schedule || job.raw || "N/A"
                    const enabled = job.enabled !== false
                    return (
                      <Card key={`${profile}-${idx}`} className="opacity-90">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">{name}</CardTitle>
                            <Badge variant={enabled ? "secondary" : "outline"} className="text-xs">
                              {enabled ? "Activo" : "Off"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <ScrollArea className="h-16 w-full">
                            <pre className="text-xs font-mono bg-muted p-2 rounded-md whitespace-pre-wrap">
                              {typeof schedule === "string"
                                ? schedule
                                : JSON.stringify(schedule, null, 2)}
                            </pre>
                          </ScrollArea>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `Eliminar ${deleteTarget.name}?` : "Eliminar job"}
        description={
          deleteTarget?.profile
            ? `Se eliminará el cron job y el profile "${deleteTarget.profile}".`
            : "Se eliminará el cron job. Esta acción no se puede deshacer."
        }
        loading={deleting}
        onConfirm={handleDeleteJob}
      />
    </div>
  )
}
