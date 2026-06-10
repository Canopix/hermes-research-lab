'use client';

import { useState, useEffect } from "react";
import { Agent, Execution } from "@/lib/types";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { AgentCardWithSSE } from "@/components/dashboard/AgentCardWithSSE";
import { AgentCardSkeleton } from "@/components/dashboard/AgentCardSkeleton";
import { StatsSkeleton } from "@/components/dashboard/StatsSkeleton";
import { AnimateIn } from "@/components/AnimateIn";
import { ErrorState } from "@/components/ErrorState";
import { getJobs, getJobOutputs } from "@/lib/api";
import { 
  Users, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Plus,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [allOutputs, setAllOutputs] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = (agentId: string, newStatus: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: newStatus as any } : a));
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

  const activeCount = agents.filter(a => a.status === 'active').length;
  const totalCount = agents.length;

  const totalOutputs = allOutputs.length;
  const completedOutputs = allOutputs.filter(o => o.status === 'completed').length;
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
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agentes</h1>
            <p className="text-muted-foreground text-sm mt-1">Gestiona tus agentes de automatización activos.</p>
          </div>
          <Button asChild size="sm">
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Agente
            </Link>
          </Button>
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
          <p className="text-muted-foreground text-sm mt-1">Gestiona tus agentes de automatización activos.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/create">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Agente
          </Link>
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-5 rounded-xl border border-dashed border-border p-12">
          <div className="bg-muted w-14 h-14 rounded-2xl flex items-center justify-center">
            <Bot className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2 max-w-sm">
            <h3 className="text-lg font-semibold text-foreground">No hay agentes</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              No hay agentes configurados. Crea tu primer agente para empezar a automatizar.
            </p>
            <Link href="/create">
              <Button size="sm" className="mt-2">
                <Plus className="mr-2 h-4 w-4" /> Crear primer agente
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <StatsBar stats={[
            { title: "Agentes Activos", value: String(activeCount), icon: Users, accentColor: "blue" },
            { title: "Total Agentes", value: String(totalCount), icon: Zap, accentColor: "green" },
            { title: "Tasa Éxito", value: `${successRate}%`, icon: CheckCircle2, accentColor: "purple" },
            { title: "Última Ejecución", value: formatLastExecution(lastExecution), icon: Clock, accentColor: "amber" },
          ]} />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCardWithSSE
                key={agent.id}
                agent={agent}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
