'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Template, ParamDef } from "@/lib/types";
import { WizardStep } from "@/components/WizardStep";
import { DynamicParam } from "@/components/DynamicParam";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, CheckCircle2, Loader2, Settings2, FileText, ArrowLeft, ArrowRight, Bot, Sparkles, Eye } from "lucide-react";
import { toast } from "sonner";

// --- Mock templates for offline development ---
const MOCK_TEMPLATES: Template[] = [
  {
    id: "researcher",
    name: "Investigador Web",
    description: "Agente que busca informacion en la web y genera resúmenes estructurados con fuentes.",
    icon: "search",
    params: [
      { name: "topic", label: "Tema de investigación", type: "text", required: true, default: "" },
      { name: "max_results", label: "Maximo de resultados", type: "number", required: false, default: 5 },
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

const STEPS = [
  { id: 1, label: "Nombre + Template" },
  { id: 2, label: "Parámetros" },
  { id: 3, label: "Resumen + Confirmar" },
];

type Step = 1 | 2 | 3;

function CreateAgentWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [agentName, setAgentName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null);

  const configRef = useRef(config);
  configRef.current = config;

  // Load templates
  useEffect(() => {
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
            setLoadingTemplates(false);
            return;
          }
        }
      } catch (e) {
        console.log("API no disponible, usando datos mock");
      }
      setTemplates(MOCK_TEMPLATES);
      setLoadingTemplates(false);
    }
    load();
  }, []);

  // Pre-select template from query param
  useEffect(() => {
    if (templates.length === 0 || selectedTemplate) return;
    const templateId = searchParams.get("template");
    if (templateId) {
      const found = templates.find((t) => t.id === templateId);
      if (found) {
        setSelectedTemplate(found);
        setConfig(
          found.params.reduce(
            (acc, p) => ({
              ...acc,
              [p.name]:
                p.default !== undefined
                  ? p.default
                  : p.type === "toggle"
                  ? false
                  : "",
            }),
            {} as Record<string, any>
          )
        );
      }
    }
  }, [templates, searchParams, selectedTemplate]);

  // Check if all required fields are filled
  const hasRequiredFields = (): boolean => {
    if (!selectedTemplate) return false;
    return selectedTemplate.params.every(
      (p) =>
        !p.required ||
        (config[p.name] !== "" &&
          config[p.name] !== undefined &&
          config[p.name] !== null)
    );
  };

  const step1Valid = agentName.trim().length > 0 && selectedTemplate !== null;
  const step2Valid = hasRequiredFields();

  const handleNext = () => {
    setError(null);
    if (currentStep === 1) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplate) return;
    setIsCreating(true);
    setError(null);

    try {
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "agenthub-local";
      const HERMES_API = process.env.NEXT_PUBLIC_HERMES_API || "http://localhost:8642";

      const res = await fetch(`${HERMES_API}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          name: agentName || selectedTemplate.name,
          template: selectedTemplate.id,
          config: configRef.current,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || errData.message || "Error al crear el agente"
        );
      }

      const agent = await res.json();
      setCreateSuccess(true);
      setCreatedAgentId(agent.id || agent.name);
      toast.success("Agente creado con éxito");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error desconocido";
      setError(errMsg);
      toast.error("Error al crear el agente");
    } finally {
      setIsCreating(false);
    }
  };

  // --- STEP 1: Nombre + Template ---
  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Paso 1: Nombre y Template
        </CardTitle>
        <CardDescription>
          Dale un nombre a tu agente y selecciona un template base.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Agent name */}
        <div className="space-y-2">
          <label htmlFor="agent-name" className="text-sm font-medium">
            Nombre del Agente <span className="text-destructive">*</span>
          </label>
          <Input
            id="agent-name"
            placeholder="Ej: Mi investigador de mercado"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
          />
        </div>

        {/* Template selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Template <span className="text-destructive">*</span>
          </label>
          {selectedTemplate ? (
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{selectedTemplate.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedTemplate.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTemplate.hermesConfig?.toolsets?.map((ts) => (
                      <Badge key={ts} variant="secondary" className="text-[10px]">
                        {ts}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTemplate(null);
                    setConfig({});
                  }}
                >
                  Cambiar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto border rounded-lg p-3">
              {templates.map((t) => (
                <button
                  key={t.id}
                  className="text-left border rounded-lg p-3 hover:bg-muted transition-colors"
                  onClick={() => {
                    setSelectedTemplate(t);
                    setConfig(
                      t.params.reduce(
                        (acc, p) => ({
                          ...acc,
                          [p.name]:
                            p.default !== undefined
                              ? p.default
                              : p.type === "toggle"
                              ? false
                              : "",
                        }),
                        {} as Record<string, any>
                      )
                    );
                  }}
                >
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end border-t pt-6">
        <Button onClick={handleNext} disabled={!step1Valid}>
          Siguiente <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  // --- STEP 2: Parámetros dinámicos ---
  const renderStep2 = () => {
    if (!selectedTemplate) return null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Configurar {selectedTemplate.name}
          </CardTitle>
          <CardDescription>
            Ajusta los parámetros necesarios para el funcionamiento del agente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {selectedTemplate.params.map((p) => (
            <DynamicParam
              key={p.name}
              param={p}
              value={config[p.name]}
              onChange={(val) =>
                setConfig((prev) => ({ ...prev, [p.name]: val }))
              }
              required={p.required}
            />
          ))}
          {selectedTemplate.params.length === 0 && (
            <p className="text-muted-foreground text-sm py-4">
              Este template no requiere parámetros adicionales.
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
          </Button>
          <Button onClick={handleNext} disabled={!step2Valid}>
            Siguiente <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  };

  // --- STEP 3: Resumen + Confirmar ---
  const renderStep3 = () => {
    if (!selectedTemplate) return null;
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Resumen y Confirmación
            </CardTitle>
            <CardDescription>
              Revisa la configuración antes de crear tu agente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Agent name */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                Nombre
              </p>
              <p className="text-sm font-medium">{agentName}</p>
            </div>
            <Separator />
            {/* Template */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                Template
              </p>
              <p className="text-sm font-medium">{selectedTemplate.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedTemplate.description}
              </p>
            </div>
            {selectedTemplate.params.length > 0 && <Separator />}
            {/* Parameters */}
            {selectedTemplate.params.length > 0 && (
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
                  Parámetros
                </p>
                <div className="space-y-2">
                  {selectedTemplate.params.map((p) => (
                    <div key={p.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{p.label}:</span>
                      <span className="font-medium">
                        {p.type === "toggle"
                          ? config[p.name]
                            ? "Activado"
                            : "Desactivado"
                          : String(config[p.name] ?? "-")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <Separator />
            {/* Toolsets */}
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                Herramientas
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedTemplate.hermesConfig?.toolsets?.map((ts) => (
                  <Badge key={ts} variant="outline">
                    {ts}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-6">
            <Button variant="ghost" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Atrás
            </Button>
            <Button
              size="lg"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  Crear Agente <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Error display */}
        {error && (
          <Card className="border-destructive/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success display */}
        {createSuccess && createdAgentId && (
          <Card className="border-green-500/50">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <div>
                  <h3 className="text-lg font-bold">¡Agente creado!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tu agente "{agentName}" se ha creado correctamente.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => router.push("/agents")}>
                    Ir al Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/agents/new")}>
                    Crear otro agente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Crear Nuevo Agente
          </h1>
          <p className="text-muted-foreground mt-1">
            Configura tu asistente inteligente en 3 pasos.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push("/agents")}>
          Cancelar
        </Button>
      </header>

      <WizardStep currentStep={currentStep} steps={STEPS} />

      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </div>
  );
}

export default function CreateAgentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CreateAgentWizard />
    </Suspense>
  );
}
