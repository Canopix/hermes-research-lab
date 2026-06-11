'use client';

import { Execution, Agent } from '@/lib/types';
import { ReportMarkdown } from './ReportMarkdown';
import { Button } from '@/components/ui/button';
import { Calendar, Copy, Link2, User, Moon } from 'lucide-react';
import { toast } from 'sonner';

function formatArticleDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface ReportArticleProps {
  execution: Execution;
  agent?: Agent;
}

export function ReportArticle({ execution, agent }: ReportArticleProps) {
  const agentName = agent?.name ?? execution.jobName ?? 'Agente';
  const title = execution.title ?? `Reporte de ${agentName}`;
  const date = formatArticleDate(execution.startedAt);

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(execution.output);
      toast.success('Reporte copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  if (execution.isSilent) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-12 text-center">
        <Moon className="mb-4 h-10 w-10 text-muted-foreground/60" />
        <h2 className="text-lg font-semibold text-foreground">Corrida silenciosa</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {agentName} ejecutó pero no encontró novedades que reportar. Esto es normal cuando
          no hay papers, noticias o updates nuevos en tus fuentes.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">{date}</p>
      </div>
    );
  }

  return (
    <article className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
      {/* Blog header */}
      <header className="mb-8 border-b border-border/60 pb-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Reporte de investigación
        </p>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-[1.15]">
          {title}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <User className="h-4 w-4" />
            {agentName}
          </span>
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {date}
          </span>
          {(execution.linkCount ?? 0) > 0 && (
            <span className="inline-flex items-center gap-2 text-primary">
              <Link2 className="h-4 w-4" />
              {execution.linkCount} enlaces a fuentes
            </span>
          )}
        </div>
        <div className="mt-5">
          <Button variant="outline" size="sm" onClick={copyReport}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar reporte
          </Button>
        </div>
      </header>

      {/* Article body */}
      <div className="mx-auto max-w-[68ch] pb-12">
        <ReportMarkdown content={execution.output} />
      </div>
    </article>
  );
}
