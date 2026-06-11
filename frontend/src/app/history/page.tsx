'use client';

import React, { useState, useEffect } from 'react';
import { getJobs, getReports } from '@/lib/api';
import { Agent, Execution } from '@/lib/types';
import { ReportFeed } from '@/components/history/ReportFeed';
import { ReportArticle } from '@/components/history/ReportArticle';
import { Button } from '@/components/ui/button';
import { History as HistoryIcon, ArrowRight, BookOpen } from 'lucide-react';
import { ErrorState } from '@/components/ErrorState';
import Link from 'next/link';

export default function HistoryPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Execution | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [agentsData, reports] = await Promise.all([
          getJobs(),
          getReports(),
        ]);
        setAgents(agentsData);
        setExecutions(reports);
        setSelected(reports[0] ?? null);
        setError(null);
      } catch (err) {
        console.error('Failed to load history:', err);
        const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
        setError(
          timedOut
            ? 'La API no respondió a tiempo. Ejecutá ./agenthub start y recargá.'
            : 'No se pudo cargar el historial. Verifica que ./agenthub status muestre los 3 servicios online.',
        );
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
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando reportes…</p>
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
        <div className="max-w-md space-y-5 rounded-xl border border-border bg-card p-8 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <HistoryIcon className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground">Aún no hay reportes</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cuando un agente ejecuta, genera un reporte en markdown — papers, tendencias,
              enlaces. Aparecerán acá en formato de lectura, como un blog.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Link href="/agents">
              <Button size="sm" variant="outline">
                Ir al Dashboard
              </Button>
            </Link>
            <Link href="/create">
              <Button size="sm">
                Crear agente <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedAgent = agents.find((a) => a.id === selected?.agentId);

  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col gap-4 lg:h-[calc(100dvh-5.5rem)] lg:min-h-0 lg:overflow-hidden">
      <header className="shrink-0 space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Reportes
        </h1>
        <p className="text-sm text-muted-foreground">
          Lectura de los informes generados por tus agentes — papers, fuentes y análisis.
        </p>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[minmax(280px,340px)_1fr] lg:gap-6">
        {/* Feed sidebar */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-4 max-lg:max-h-[min(360px,42vh)]">
          <div className="mb-3 flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            {executions.length} reporte{executions.length === 1 ? '' : 's'}
          </div>
          <ReportFeed
            executions={executions}
            agents={agents}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            agentFilter={agentFilter}
            onAgentFilterChange={setAgentFilter}
          />
        </aside>

        {/* Article reader */}
        <main className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 sm:p-8 max-lg:min-h-[50vh]">
          {selected ? (
            <ReportArticle execution={selected} agent={selectedAgent} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Seleccioná un reporte para leerlo
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
