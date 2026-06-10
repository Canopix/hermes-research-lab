'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getJobs, getJobOutputs, searchSessions } from '@/lib/api';
import { Agent, Execution } from '@/lib/types';
import { ExecutionTable } from '@/components/history/ExecutionTable';
import { OutputViewer } from '@/components/history/OutputViewer';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowRight, History as HistoryIcon, Bot } from 'lucide-react';
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
        <div className="space-y-2 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground text-sm">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">{error}</h2>
          <Button onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-6 max-w-md p-8 bg-card rounded-xl border shadow-sm">
          <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <HistoryIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">No hay ejecuciones aún</h2>
            <p className="text-muted-foreground">
              Parece que aún no has ejecutado ningún agente. Crea un agente para empezar a generar outputs.
            </p>
          </div>
          <Link href="/create">
            <Button className="w-full">
              Crear un Agente <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Historial de Ejecuciones</h1>
        <p className="text-muted-foreground">
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
