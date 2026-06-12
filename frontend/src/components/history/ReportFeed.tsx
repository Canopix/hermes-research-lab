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
    // Skip failed executions — they don't contain useful research data
    if (exec.isFailed) return false;

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
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
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

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [-webkit-overflow-scrolling:touch]">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground/60">Sin reportes que coincidan.</p>
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
                  'w-full rounded-lg border p-3.5 text-left transition-all',
                  selected
                    ? 'border-primary/30 bg-primary/3 shadow-sm'
                    : 'border-border/40 bg-card hover:border-border hover:bg-muted/20',
                )}
              >
                <div className="mb-1.5 flex items-start gap-2">
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                    {title}
                  </h3>
                </div>
                <p className="mb-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground/70">
                  {exec.excerpt ?? exec.output.slice(0, 160)}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50 font-mono">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {agentName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {date}
                  </span>
                  {(exec.linkCount ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 text-primary/70">
                      <Link2 className="h-3 w-3" />
                      {exec.linkCount} fuentes
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
