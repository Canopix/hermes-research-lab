'use client';

import React, { useState, useEffect, Suspense, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getTemplates, previewTemplate, createJob, getProviders, getChannels, getSkillsList, getToolsetsList } from "@/lib/api";
import type { Template, Agent, ProviderOption, DeliveryChannel, SkillInfo, ToolsetInfo } from "@/lib/types";
import { TemplateCard } from "@/components/builder/TemplateCard";
import { TemplateCardSkeleton } from "@/components/builder/TemplateCardSkeleton";
import { WizardStepper } from "@/components/builder/WizardStepper";
import { DynamicParam } from "@/components/builder/DynamicParam";
import { ProviderModelSelector } from "@/components/builder/ProviderModelSelector";
import { SkillsSelector } from "@/components/builder/SkillsSelector";
import { ToolsetsSelector } from "@/components/builder/ToolsetsSelector";
import { ScheduleSelector } from "@/components/builder/ScheduleSelector";
import { DeliverySelector } from "@/components/builder/DeliverySelector";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Code, Settings2, FlaskConical, FileText, ArrowLeft, RotateCcw, Layers } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ErrorState";
import { AnimateIn } from "@/components/AnimateIn";

type Step = 1 | 2 | 3 | 4;

const DEFAULT_SCHEDULE = "0 */6 * * *";
const DEFAULT_DELIVER = "local";

type ErrorType = "network" | "http" | "other" | null;

interface WizardState {
  step: Step;
  selectedTemplate: Template | null;
  agentName: string;
  config: Record<string, any>;
  preview: string | null;
  isCreating: boolean;
  error: string | null;
  errorType: ErrorType;
  schedule: string;
  deliver: string;
  selectedProvider: string;
  selectedModel: string;
  selectedSkills: string[];
  selectedToolsets: string[];
}

const STEPS = [
  { id: 1, label: "Template" },
  { id: 2, label: "Configurar" },
  { id: 3, label: "Preview" },
  { id: 4, label: "Crear" },
];

function CreateAgentWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [channels, setChannels] = useState<DeliveryChannel[]>([]);
  const [skillsList, setSkillsList] = useState<SkillInfo[]>([]);
  const [toolsetsList, setToolsetsList] = useState<ToolsetInfo[]>([]);
  const [configTab, setConfigTab] = useState<"params" | "model" | "skills" | "toolsets" | "schedule" | "delivery">("params");
  const [wizard, setWizard] = useState<WizardState>({
    step: 1,
    selectedTemplate: null,
    agentName: "",
    config: {},
    preview: null,
    isCreating: false,
    error: null,
    errorType: null,
    schedule: DEFAULT_SCHEDULE,
    deliver: DEFAULT_DELIVER,
    selectedProvider: "default",
    selectedModel: "",
    selectedSkills: [],
    selectedToolsets: [],
  });

  const wizardRef = useRef(wizard);
  wizardRef.current = wizard;

  const stepContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stepContentRef.current) {
      stepContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [wizard.step]);

  useEffect(() => {
    async function load() {
      try {
        const data = await getTemplates();
        setTemplates(data);

        const [providersData, channelsData, skillsData, toolsetsData] = await Promise.all([
          getProviders().catch(() => ({ default_provider: "custom", default_model: "", options: [] })),
          getChannels().catch(() => []),
          getSkillsList().catch(() => []),
          getToolsetsList().catch(() => []),
        ]);
        setProviders(providersData.options || []);
        setChannels(channelsData);
        setSkillsList(skillsData);
        setToolsetsList(toolsetsData);
        
        const templateId = searchParams.get("templateId");
        if (templateId) {
          const selected = data.find(t => t.id === templateId);
          if (selected) {
            setWizard(prev => ({ ...prev, selectedTemplate: selected, agentName: selected.name, step: 2 }));
          }
        }
      } catch (err) {
        console.error("Failed to load templates", err);
        toast.error("Error al cargar los templates");
      } finally {
        setLoadingTemplates(false);
      }
    }
    load();
  }, [searchParams]);

  const handleTemplateSelect = (template: Template) => {
    const hasParams = template.params && template.params.length > 0;
    const templateToolsets = template.hermesConfig?.toolsets || [];
    setWizard(prev => ({
      ...prev,
      selectedTemplate: template,
      agentName: template.name,
      step: hasParams ? 2 : 3,
      config: template.params.reduce((acc, p) => ({
        ...acc,
        [p.name]: p.default !== undefined ? p.default : (p.type === 'toggle' ? false : "")
      }), {}),
      selectedToolsets: templateToolsets,
    }));
  };

  const nextStep = useCallback(async () => {
    const current = wizardRef.current;
    if (!current.selectedTemplate) return;

    if (current.step === 2) {
      if (!current.agentName || current.agentName.trim() === "") {
        toast.error("El nombre del agente es obligatorio");
        return;
      }
      try {
        setWizard(prev => ({ ...prev, step: 3 }));
        const previewText = await previewTemplate(current.selectedTemplate.id, current.config);
        setWizard(prev => ({ ...prev, preview: previewText }));
      } catch (err) {
        setWizard(prev => ({ ...prev, error: "Error al generar preview" }));
        toast.error("Error al generar el preview");
      }
    } else if (current.step === 3) {
      try {
        setWizard(prev => ({ ...prev, step: 4, isCreating: true }));
        await createJob({
          name: wizardRef.current.agentName || current.selectedTemplate.name,
          template: current.selectedTemplate.id,
          config: current.config,
          prompt: current.preview || "",
          schedule: current.schedule,
          deliver: current.deliver,
          skills: current.selectedSkills.length > 0 ? current.selectedSkills : undefined,
          enabled_toolsets: current.selectedToolsets.length > 0 ? current.selectedToolsets : undefined,
          model: current.selectedModel ? { model: current.selectedModel, provider: current.selectedProvider } : undefined,
        });
        toast.success("Agente creado con éxito");
        router.push("/agents");
      } catch (err) {
        const isNetworkError = !err || (err instanceof Error && (
          err.message.includes("fetch") ||
          err.message.includes("NetworkError") ||
          err.message.includes("Failed to fetch") ||
          err.message.includes("ECONNREFUSED") ||
          err.message.includes("ECONNRESET") ||
          err.message.includes("ENOTFOUND") ||
          err.message.includes("timeout") ||
          err.message.includes("timeout of")
        ));
        
        let errorType: ErrorType = "other";
        let errMsg = "Error desconocido";
        
        if (err instanceof Error) {
          errMsg = err.message;
          const status = (err as any).status;
          if (isNetworkError) {
            errorType = "network";
          } else if (status) {
            errorType = "http";
          }
        }
        
        setWizard(prev => ({ 
          ...prev, 
          isCreating: false, 
          error: errMsg,
          errorType 
        }));
        toast.error("Error al crear el agente");
      }
    }
  }, []);

  const prevStep = () => {
    setWizard(prev => ({ ...prev, step: (prev.step - 1) as Step, error: null }));
  };

  if (loadingTemplates && wizard.step === 1) {
    return (
      <div className="max-w-5xl mx-auto pb-20">
        <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-7 w-52 bg-muted rounded animate-pulse" />
            <div className="h-4 w-72 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
        </header>
        <div className="h-6 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <TemplateCardSkeleton />
          <TemplateCardSkeleton />
          <TemplateCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Crear Agente</h1>
          <p className="text-muted-foreground mt-1">Configura un nuevo agente de investigación.</p>
        </div>
        <Button variant="outline" onClick={() => router.push("/agents")}>
          Cancelar
        </Button>
      </header>

      <WizardStepper currentStep={wizard.step} steps={STEPS} />

      <div ref={stepContentRef} className="mt-8 sm:mt-12">
        {wizard.step === 1 && (
          <AnimateIn key={wizard.step} direction="up" delay={100} duration={300}>
          <div className="space-y-8">
            <div className="flex items-center gap-2 text-lg font-medium text-foreground">
              <FlaskConical className="h-5 w-5 text-primary" />
              <span>Selecciona una base para tu agente</span>
            </div>
            {templates.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground space-y-4">
                  <FileText className="h-12 w-12 mx-auto opacity-30" />
                  <p>No hay templates disponibles en este momento.</p>
                  <p className="text-xs">Los templates se cargan desde la Exploration API.</p>
                </CardContent>
              </Card>
            ) : (
              (() => {
                // Group templates by category
                const grouped: Record<string, typeof templates> = {};
                templates.forEach((t) => {
                  const cat = t.category || "other";
                  if (!grouped[cat]) grouped[cat] = [];
                  grouped[cat].push(t);
                });
                const categoryOrder = [
                  "research-intelligence",
                  "development-workflow",
                  "devops-monitoring",
                  "multi-skill-workflows",
                  "other",
                ];
                const categoryLabels: Record<string, string> = {
                  "research-intelligence": "Research & Intelligence",
                  "development-workflow": "Development Workflow",
                  "devops-monitoring": "DevOps & Monitoring",
                  "multi-skill-workflows": "Multi-Skill Workflows",
                  "other": "Other",
                };
                const orderedCats = Object.keys(grouped).sort(
                  (a, b) => {
                    const ai = categoryOrder.indexOf(a);
                    const bi = categoryOrder.indexOf(b);
                    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                  }
                );
                return orderedCats.map((cat) => (
                  <div key={cat} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                        {categoryLabels[cat] || cat}
                      </h3>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {grouped[cat].length}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {grouped[cat].map((t) => (
                        <TemplateCard
                          key={t.id}
                          template={t}
                          isSelected={wizard.selectedTemplate?.id === t.id}
                          onClick={handleTemplateSelect}
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
          </AnimateIn>
        )}

        {wizard.step === 2 && wizard.selectedTemplate && (
          <AnimateIn key={wizard.step} direction="up" delay={100} duration={300}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-primary" />
                Configurar {wizard.selectedTemplate.name}
              </CardTitle>
              <CardDescription>
                Ajusta los parámetros para el funcionamiento del agente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tab bar */}
              <div className="flex flex-wrap gap-1 border-b pb-2">
                {([
                  ["params", "Parámetros"],
                  ["model", "Modelo"],
                  ["skills", "Skills"],
                  ["toolsets", "Toolsets"],
                  ["schedule", "Schedule"],
                  ["delivery", "Entrega"],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setConfigTab(key)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                      configTab === key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab: Params */}
              {configTab === "params" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="agentName" className="text-sm font-medium">
                      Nombre del agente <span className="text-destructive">*</span>
                    </label>
                    <Input
                      id="agentName"
                      type="text"
                      placeholder={wizard.selectedTemplate.name}
                      value={wizard.agentName}
                      onChange={(e) => setWizard(prev => ({ ...prev, agentName: e.target.value }))}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground/60">
                      Nombre descriptivo para tu agente personalizado.
                    </p>
                  </div>
                  <Separator />
                  {wizard.selectedTemplate.params.map((p) => (
                    <DynamicParam
                      key={p.name}
                      param={p}
                      value={wizard.config[p.name]}
                      onChange={(val) => setWizard(prev => ({
                        ...prev,
                        config: { ...prev.config, [p.name]: val }
                      }))}
                      required={p.required}
                    />
                  ))}
                </div>
              )}

              {/* Tab: Model */}
              {configTab === "model" && (
                <ProviderModelSelector
                  providers={providers}
                  selectedProvider={wizard.selectedProvider}
                  selectedModel={wizard.selectedModel}
                  onProviderChange={(v) => setWizard(prev => ({ ...prev, selectedProvider: v }))}
                  onModelChange={(v) => setWizard(prev => ({ ...prev, selectedModel: v }))}
                />
              )}

              {/* Tab: Skills */}
              {configTab === "skills" && (
                <SkillsSelector
                  skills={skillsList}
                  selectedSkills={wizard.selectedSkills}
                  recommendedSkills={wizard.selectedTemplate.hermesConfig?.skills || []}
                  onToggle={(name) => setWizard(prev => ({
                    ...prev,
                    selectedSkills: prev.selectedSkills.includes(name)
                      ? prev.selectedSkills.filter(s => s !== name)
                      : [...prev.selectedSkills, name]
                  }))}
                />
              )}

              {/* Tab: Toolsets */}
              {configTab === "toolsets" && (
                <ToolsetsSelector
                  toolsets={toolsetsList}
                  selectedToolsets={wizard.selectedToolsets}
                  onToggle={(name) => setWizard(prev => ({
                    ...prev,
                    selectedToolsets: prev.selectedToolsets.includes(name)
                      ? prev.selectedToolsets.filter(t => t !== name)
                      : [...prev.selectedToolsets, name]
                  }))}
                />
              )}

              {/* Tab: Schedule */}
              {configTab === "schedule" && (
                <ScheduleSelector
                  value={wizard.schedule}
                  onChange={(v) => setWizard(prev => ({ ...prev, schedule: v }))}
                />
              )}

              {/* Tab: Delivery */}
              {configTab === "delivery" && (
                <DeliverySelector
                  channels={channels}
                  selectedDelivery={wizard.deliver}
                  onChange={(v) => setWizard(prev => ({ ...prev, deliver: v }))}
                />
              )}
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row sm:justify-between gap-3 border-t pt-6">
              <Button variant="ghost" onClick={prevStep}>Atrás</Button>
              <Button onClick={nextStep}>
                Siguiente <span className="ml-2">→</span>
              </Button>
            </CardFooter>
          </Card>
          </AnimateIn>
        )}

        {wizard.step === 3 && (
          <AnimateIn key={wizard.step} direction="up" delay={100} duration={300}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    Preview del Prompt
                  </CardTitle>
                  <CardDescription>
                    Instrucciones que el modelo interpretará.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap min-h-[300px] border border-border/40">
                    {wizard.preview || "Generando preview..."}
                  </pre>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Agente</p>
                    <p className="text-sm font-medium">{wizard.agentName}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Template</p>
                    <p className="text-sm font-medium">{wizard.selectedTemplate?.name}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Modelo</p>
                    <p className="text-sm font-medium font-mono text-xs">{wizard.selectedProvider}/{wizard.selectedModel || "(default)"}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {wizard.selectedSkills.map(s => (
                        <Badge key={s} variant="outline" className="rounded-md text-[10px]">{s}</Badge>
                      ))}
                      {wizard.selectedSkills.length === 0 && <span className="text-xs text-muted-foreground/60">Ninguna seleccionada</span>}
                    </div>
                  </div>
                  <Separator />
                  {wizard.selectedTemplate?.params && wizard.selectedTemplate.params.length > 0 && (
                    <>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-2">Parámetros</p>
                        <div className="space-y-2">
                          {Object.entries(wizard.config).map(([key, val]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="font-medium font-mono text-xs">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Toolsets</p>
                    <div className="flex flex-wrap gap-1">
                      {wizard.selectedToolsets.map(t => (
                        <Badge key={t} variant="outline" className="rounded-md text-[10px]">{t}</Badge>
                      ))}
                      {wizard.selectedToolsets.length === 0 && <span className="text-xs text-muted-foreground/60">Ninguno seleccionado</span>}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Schedule</p>
                    <p className="text-sm font-medium font-mono">{wizard.schedule}</p>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider mb-1">Deliver</p>
                    <p className="text-sm font-medium">{wizard.deliver}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3">
                <Button size="lg" className="w-full bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/30" onClick={nextStep}>
                  Crear Agente
                </Button>
                <Button variant="outline" size="lg" className="w-full" onClick={prevStep}>
                  Atrás
                </Button>
              </div>
            </div>
          </div>
          </AnimateIn>
        )}

        {wizard.step === 4 && (
          <AnimateIn key={wizard.step} direction="up" delay={100} duration={300}>
          <Card className="text-center py-12">
            <CardContent className="flex flex-col items-center justify-center space-y-6">
              {wizard.isCreating ? (
                <>
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div>
                    <h2 className="text-2xl font-bold">Creando agente...</h2>
                    <p className="text-muted-foreground mt-2">Preparando el entorno.</p>
                    <p className="text-sm text-muted-foreground mt-1 font-medium font-mono">{wizard.agentName}</p>
                  </div>
                </>
              ) : wizard.error ? (
                <ErrorState
                  title={wizard.errorType === "network" ? "Error de conexión" : "Algo salió mal"}
                  description={
                    wizard.errorType === "network"
                      ? "No se pudo conectar con el servidor. Verifica que Exploration API esté corriendo en :8643."
                      : wizard.errorType === "http"
                      ? "El servidor respondió con un error."
                      : wizard.error
                  }
                  retry={nextStep}
                  action={{ label: "Volver al Paso 3", href: "/create" }}
                />
              ) : (
                <>
                  <CheckCircle2 className="h-12 w-12 text-success" />
                  <div>
                    <h2 className="text-2xl font-bold">¡Agente creado!</h2>
                    <p className="text-muted-foreground mt-2">Tu agente <strong>{wizard.agentName}</strong> está listo.</p>
                  </div>
                  <Button onClick={() => router.push("/agents")} size="lg">
                    Ir al Dashboard
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
          </AnimateIn>
        )}
      </div>
    </div>
  );
}

export default function CreateAgentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CreateAgentWizard />
    </Suspense>
  );
}
