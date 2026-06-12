'use client';

import { useState, useEffect } from "react";
import { Agent, Execution } from "@/lib/types";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { AgentCardWithSSE } from "@/components/dashboard/AgentCardWithSSE";
import { AgentCardSkeleton } from "@/components/dashboard/AgentCardSkeleton";
import { StatsSkeleton } from "@/components/dashboard/StatsSkeleton";
import { AnimateIn } from "@/components/AnimateIn";
import { ErrorState } from "@/components/ErrorState";
import { getJobs, getJobOutputs, deleteJob } from "@/lib/api";
import { toast } from "sonner";
import { 
  Users, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Plus,
  FlaskConical,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [allOutputs, setAllOutputs] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAgentChange = (agentId: string, patch: Partial<Agent>) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, ...patch } : a));
  };

  const handleDeleteAgent = async (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    try {
      const result = await deleteJob(agentId);
      setAgents(prev => prev.filter(a => a.id !== agentId));
      if (result.profile_deleted && result.profile) {
        toast.success(`${agent?.name ?? "Agente"} eliminado (job + profile)`);
      } else {
        toast.success(`${agent?.name ?? "Agente"} eliminado`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar";
      toast.error(msg);
      throw err;
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const agentsData = await getJobs();
        setAgents(agentsData);

        const outputsResults = await Promise.all(
          agentsData.map(a => getJobOutputs(a.id).catch(() => []))
        );
        const flattened = outputsResults.flat();
        setAllOutputs(flattened);

        setError(null);
      } catch (err) {
        console.error("Failed to load agents:", err);
        setError("No se pudo conectar con Hermes. Verifica que el API Server esté corriendo en :8642.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCount = agents.filter(a => a.status === 'active' || a.status === 'running').length;
  const totalCount = agents.length;

  const totalOutputs = allOutputs.length;
  const completedOutputs = allOutputs.filter(o => {
    const s = o.status.toLowerCase()
    return s === 'completed' || s === 'success'
  }).length;
  const successRate = totalOutputs > 0 ? Math.round((completedOutputs / totalOutputs) * 100) : 0;

  const lastExecution = allOutputs.length > 0
    ? allOutputs
        .filter(o => o.startedAt)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0]
        ?.startedAt
    : null;

  const formatLastExecution = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
        <StatsSkeleton />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <AgentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Agentes</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestiona los agentes activos de investigación.</p>
          </div>
          <Link
            href="/create"
            className={cn(buttonVariants({ size: "sm" }), "inline-flex shrink-0")}
          >
            <Plus className="mr-2 h-4 w-4" /> Nuevo Agente
          </Link>
        </div>
        <ErrorState
          title="Error de conexión"
          description={error}
          retry={() => window.location.reload()}
          action={{ label: "Nuevo Agente", href: "/create" }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Agentes</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona los agentes activos de investigación.</p>
        </div>
        <Link
          href="/create"
          className={cn(buttonVariants({ size: "sm" }), "inline-flex shrink-0")}
        >
          <Plus className="mr-2 h-4 w-4" /> Nuevo Agente
        </Link>
      </div>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-5 rounded-xl border border-dashed border-border/50 p-12">
          <div className="bg-muted/50 w-12 h-12 rounded-lg flex items-center justify-center border border-border/40">
            <FlaskConical className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <div className="text-center space-y-2 max-w-sm">
            <h3 className="text-lg font-semibold text-foreground">Sin agentes configurados</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              No hay agentes en ejecución. Creá tu primer agente para comenzar la investigación.
            </p>
            <Link
              href="/create"
              className={cn(buttonVariants({ size: "sm" }), "mt-2 inline-flex")}
            >
              <Plus className="mr-2 h-4 w-4" /> Crear primer agente
            </Link>
          </div>
        </div>
      ) : (
        <>
          <StatsBar stats={[
            { title: "Activos", value: String(activeCount), icon: Users, accentColor: "success" },
            { title: "Total", value: String(totalCount), icon: Zap, accentColor: "primary" },
            { title: "Tasa Éxito", value: `${successRate}%`, icon: CheckCircle2, accentColor: "info" },
            { title: "Última Ejecución", value: formatLastExecution(lastExecution), icon: Clock, accentColor: "warning" },
          ]} />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCardWithSSE
                key={agent.id}
                agent={agent}
                onAgentChange={handleAgentChange}
                onDelete={handleDeleteAgent}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
