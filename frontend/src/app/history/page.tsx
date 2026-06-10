'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getJobs, getJobOutputs, searchSessions } from '@/lib/api';
import { Agent, Execution } from '@/lib/types';
import { ExecutionTable } from '@/components/history/ExecutionTable';
import { OutputViewer } from '@/components/history/OutputViewer';
import { Button } from '@/components/ui/button';
import { History as HistoryIcon, ArrowRight } from 'lucide-react';
import { ErrorState } from '@/components/ErrorState';
import Link from 'next/link';

export default function HistoryPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [agentsData, allExecutions] = await Promise.all([
          getJobs(), 
          searchSessions('') 
        ]);
        
        setAgents(agentsData);
        setExecutions(allExecutions as unknown as Execution[]);
        setError(null);
      } catch (err) {
        console.error('Failed to load history:', err);
        setError('No se pudo cargar el historial. Verifica tu conexión.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground text-sm">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Error al cargar el historial"
        description={error}
        retry={() => window.location.reload()}
      />
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-5 max-w-sm p-8 bg-card rounded-xl border border-border shadow-xs">
          <div className="bg-muted w-14 h-14 rounded-2xl flex items-center justify-center mx-auto">
            <HistoryIcon className="w-7 h-7 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">No hay ejecuciones aún</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Parece que aún no has ejecutado ningún agente. Crea un agente para empezar a generar outputs.
            </p>
          </div>
          <Link href="/create">
            <Button size="sm">
              Crear un Agente <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Historial de Ejecuciones</h1>
        <p className="text-muted-foreground text-sm">
          Monitorea y revisa todas las actividades y outputs de tus agentes.
        </p>
      </div>

      <ExecutionTable 
        executions={executions} 
        agents={agents} 
        onRowClick={(exec) => setSelectedExecution(exec)} 
      />

      {selectedExecution && (
        <OutputViewer 
          execution={selectedExecution} 
          agentName={agents.find(a => a.id === selectedExecution.agentId)?.name}
          onClose={() => setSelectedExecution(null)} 
        />
      )}
    </div>
  );
}
