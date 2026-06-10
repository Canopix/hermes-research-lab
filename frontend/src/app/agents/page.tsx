'use client';

import { useState, useEffect } from "react";
import { Agent } from "@/lib/types";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { AgentCard } from "@/components/dashboard/AgentCard";
import { getJobs } from "@/lib/api";
import { 
  Users, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Plus,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getJobs();
        setAgents(data);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Cargando agentes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Agentes</h2>
            <p className="text-muted-foreground">Gestiona tus agentes de automatización activos.</p>
          </div>
          <Button asChild>
            <Link href="/create">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Agente
            </Link>
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4 rounded-lg border border-destructive/20 bg-destructive/5 p-8">
          <div className="text-destructive">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div className="text-center space-y-2 max-w-md">
            <h3 className="text-lg font-semibold text-destructive">Error de conexión</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agentes</h2>
          <p className="text-muted-foreground">Gestiona tus agentes de automatización activos.</p>
        </div>
        <Button asChild>
          <Link href="/create">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Agente
          </Link>
        </Button>
      </div>

      <StatsBar stats={[
        { title: "Agentes Activos", value: String(agents.filter(a => a.status === 'active').length), icon: Users },
        { title: "Total Agentes", value: String(agents.length), icon: Zap },
        { title: "Tasa Éxito", value: "N/A", icon: CheckCircle2 },
        { title: "Última Ejecución", value: "N/A", icon: Clock },
      ]} />

      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] space-y-6 rounded-lg border-2 border-dashed border-muted-foreground/20 p-12">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center">
            <Bot className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <h3 className="text-xl font-semibold">No hay agentes</h3>
            <p className="text-muted-foreground">
              No hay agentes configurados. Crea tu primer agente para empezar a automatizar.
            </p>
            <Link href="/create">
              <Button size="lg">
                <Plus className="mr-2 h-4 w-4" /> Crear primer agente
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
