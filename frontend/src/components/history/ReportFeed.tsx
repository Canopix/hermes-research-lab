'use client';

import { Execution, Agent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BookOpen, Calendar, Link2, User } from 'lucide-react';

function formatReportDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface ReportFeedProps {
  executions: Execution[];
  agents: Agent[];
  selectedId: string | null;
  onSelect: (execution: Execution) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  agentFilter: string;
  onAgentFilterChange: (value: string) => void;
}

function getAgentName(agents: Agent[], agentId: string, execution: Execution) {
  return agents.find((a) => a.id === agentId)?.name ?? execution.jobName ?? 'Agente';
}

export function ReportFeed({
  executions,
  agents,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
  agentFilter,
  onAgentFilterChange,
}: ReportFeedProps) {
  const filtered = executions.filter((exec) => {
    const haystack = [
      exec.title,
      exec.excerpt,
      exec.output,
      getAgentName(agents, exec.agentId, exec),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
    const matchesAgent = agentFilter === 'all' || exec.agentId === agentFilter;
    return matchesSearch && matchesAgent;
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="shrink-0 space-y-3">
        <input
          type="search"
          placeholder="Buscar en reportes…"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <select
          value={agentFilter}
          onChange={(e) => onAgentFilterChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring"
        >
          <option value="all">Todos los agentes</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin reportes que coincidan.</p>
        ) : (
          filtered.map((exec) => {
            const agentName = getAgentName(agents, exec.agentId, exec);
            const title = exec.title ?? `Reporte de ${agentName}`;
            const date = formatReportDate(exec.startedAt);
            const selected = selectedId === exec.id;

            return (
              <button
                key={exec.id}
                type="button"
                onClick={() => onSelect(exec)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left transition-all',
                  selected
                    ? 'border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20'
                    : 'border-border/60 bg-card hover:border-border hover:bg-muted/30',
                )}
              >
                <div className="mb-2 flex items-start gap-2">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                    {title}
                  </h3>
                </div>
                <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                  {exec.excerpt ?? exec.output.slice(0, 160)}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {agentName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {date}
                  </span>
                  {(exec.linkCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-primary/80">
                      <Link2 className="h-3 w-3" />
                      {exec.linkCount} enlaces
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
