'use client';

import { useState, useEffect } from "react";
import { Template, ParamDef } from "@/lib/types";
import { TemplateCard } from "./TemplateCard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Bot } from "lucide-react";

// --- Mock templates for offline development ---
const MOCK_TEMPLATES: Template[] = [
  {
    id: "researcher",
    name: "Investigador Web",
    description: "Agente que busca información en la web y genera resúmenes estructurados con fuentes.",
    icon: "search",
    params: [
      { name: "topic", label: "Tema de investigación", type: "text", required: true, default: "" },
      { name: "max_results", label: "Máximo de resultados", type: "number", required: false, default: 5 },
      { name: "include_sources", label: "Incluir fuentes", type: "toggle", required: false, default: true },
    ] as ParamDef[],
    hermesConfig: { toolsets: ["web_search", "summarizer"], skills: ["research"] },
  },
  {
    id: "monitor",
    name: "Monitor de Actividad",
    description: "Monitorea un sitio web o API y notifica sobre cambios o eventos específicos.",
    icon: "activity",
    params: [
      { name: "target_url", label: "URL a monitorear", type: "url", required: true, default: "" },
      { name: "check_interval", label: "Intervalo de chequeo (min)", type: "number", required: true, default: 30 },
      { name: "notify_on_change", label: "Notificar cambios", type: "toggle", required: false, default: true },
    ] as ParamDef[],
    hermesConfig: { toolsets: ["web_scraper", "notifications"], skills: ["monitoring"] },
  },
  {
    id: "summarizer",
    name: "Resumidor de Documentos",
    description: "Procesa documentos y genera resúmenes ejecutivos con puntos clave.",
    icon: "file_text",
    params: [
      { name: "document_url", label: "URL del documento", type: "url", required: true, default: "" },
      { name: "summary_length", label: "Longitud del resumen", type: "select", required: true, options: ["Corto (1 párrafo)", "Medio (3 párrafos)", "Largo (5 párrafos)"], default: "Medio (3 párrafos)" },
      { name: "include_key_points", label: "Incluir puntos clave", type: "toggle", required: false, default: true },
    ] as ParamDef[],
    hermesConfig: { toolsets: ["document_reader", "summarizer"], skills: ["summarization"] },
  },
  {
    id: "coder",
    name: "Asistente de Código",
    description: "Analiza repositorios, genera código y revisa pull requests automáticamente.",
    icon: "code",
    params: [
      { name: "repo_url", label: "URL del repositorio", type: "url", required: true, default: "" },
      { name: "task_type", label: "Tipo de tarea", type: "select", required: true, options: ["code_review", "generate_code", "bug_fix", "refactor"], default: "code_review" },
      { name: "language", label: "Lenguaje principal", type: "select", required: false, options: ["Python", "JavaScript", "TypeScript", "Rust", "Go"], default: "Python" },
    ] as ParamDef[],
    hermesConfig: { toolsets: ["code_reader", "code_writer"], skills: ["coding"] },
  },
  {
    id: "analyst",
    name: "Analista de Datos",
    description: "Analiza datasets, genera gráficos y produce reportes con insights accionables.",
    icon: "bar_chart",
    params: [
      { name: "data_source", label: "Fuente de datos", type: "text", required: true, default: "" },
      { name: "analysis_depth", label: "Profundidad del análisis", type: "select", required: true, options: ["Básico", "Intermedio", "Avanzado"], default: "Intermedio" },
      { name: "export_csv", label: "Exportar CSV", type: "toggle", required: false, default: false },
    ] as ParamDef[],
    hermesConfig: { toolsets: ["data_processor", "visualization"], skills: ["analytics"] },
  },
  {
    id: "email_assistant",
    name: "Asistente de Email",
    description: "Clasifica, redacta y responde emails de forma automática basada en contexto.",
    icon: "mail",
    params: [
      { name: "inbox_folder", label: "Carpeta de inbox", type: "text", required: true, default: "INBOX" },
      { name: "auto_reply", label: "Respuesta automática", type: "toggle", required: false, default: false },
      { name: "tone", label: "Tono de respuesta", type: "select", required: false, options: ["Formal", "Casual", "Técnico"], default: "Formal" },
    ] as ParamDef[],
    hermesConfig: { toolsets: ["email_reader", "email_writer"], skills: ["email"] },
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterToolset, setFilterToolset] = useState<string>("all");

  useEffect(() => {
    // Try real API first, fall back to mock
    async function load() {
      try {
        const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "agenthub-local";
        const EXPLORE_API = process.env.NEXT_PUBLIC_EXPLORE_API || "http://localhost:8643";
        const res = await fetch(`${EXPLORE_API}/api/templates`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setTemplates(data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.log("API no disponible, usando datos mock");
      }
      // Fallback: mock data
      setTemplates(MOCK_TEMPLATES);
      setLoading(false);
    }
    load();
  }, []);

  // Collect all unique toolsets for filter
  const allToolsets = Array.from(
    new Set(templates.flatMap((t) => t.hermesConfig?.toolsets || []))
  ).sort();

  const filtered = templates.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesToolset =
      filterToolset === "all" ||
      t.hermesConfig?.toolsets?.includes(filterToolset);
    return matchesSearch && matchesToolset;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Cargando catálogo de templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de Templates</h1>
        <p className="text-muted-foreground mt-1">
          Elige un template para crear tu agente rápidamente.
        </p>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterToolset}
            onChange={(e) => setFilterToolset(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          >
            <option value="all">Todas las herramientas</option>
            {allToolsets.map((ts) => (
              <option key={ts} value={ts}>{ts}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} template{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-4">
            <Bot className="h-12 w-12 mx-auto opacity-30" />
            <p>No se encontraron templates con esos filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  );
}
