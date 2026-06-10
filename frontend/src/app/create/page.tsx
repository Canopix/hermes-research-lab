"use client";

import { useState } from "react";
import { useTemplates } from "@/hooks/useQueries";
import { Template, TemplateParam } from "@/lib/types";
import { hermes, explore } from "@/lib/api";

type WizardStep = "template" | "params" | "summary" | "creating" | "done";

export default function CreatePage() {
  const { data: templates, loading, error } = useTemplates();
  const [step, setStep] = useState<WizardStep>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [jobName, setJobName] = useState("");
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    const defaultParams: Record<string, string> = {};
    template.params.forEach((p) => {
      if (p.default !== undefined) {
        defaultParams[p.name] = String(p.default);
      }
    });
    setParams(defaultParams);
    setStep("params");
  };

  const handleParamChange = (name: string, value: string) => {
    setParams((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !jobName) return;

    setStep("creating");
    try {
      const job = await hermes.createJob({
        name: jobName,
        template_id: selectedTemplate.id,
        params,
      });
      setCreatedJobId(job.id);
      setStep("done");
    } catch (err) {
      console.error("Failed to create job:", err);
      setStep("summary");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-white">Loading templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Create Agent</h1>

      {/* Progress steps */}
      <div className="flex items-center mb-8">
        {["template", "params", "summary"].map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s
                  ? "bg-blue-600 text-white"
                  : i < ["template", "params", "summary"].indexOf(step)
                  ? "bg-green-600 text-white"
                  : "bg-gray-700 text-gray-400"
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && <div className="w-16 h-0.5 bg-gray-700 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step: Choose Template */}
      {step === "template" && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Choose a Template
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates?.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className="bg-gray-900 rounded-lg p-4 border border-gray-800 text-left hover:border-blue-600 transition-colors"
              >
                <h3 className="text-lg font-medium text-white mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-400 mb-2">
                  {template.description}
                </p>
                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
                  {template.category}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Configure Parameters */}
      {step === "params" && selectedTemplate && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Configure: {selectedTemplate.name}
          </h2>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 max-w-lg">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Job Name *
              </label>
              <input
                type="text"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="My AI Agent"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            {selectedTemplate.params.map((param) => (
              <div key={param.name} className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {param.label}
                  {param.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={param.type === "number" ? "number" : "text"}
                  value={params[param.name] || ""}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setStep("template")}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={() => setStep("summary")}
                disabled={!jobName}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Summary */}
      {step === "summary" && selectedTemplate && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Summary</h2>
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 max-w-lg">
            <div className="mb-4">
              <p className="text-sm text-gray-400">Job Name</p>
              <p className="text-white">{jobName}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-400">Template</p>
              <p className="text-white">{selectedTemplate.name}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-400">Parameters</p>
              <pre className="text-sm text-gray-300 bg-gray-800 p-2 rounded mt-1">
                {JSON.stringify(params, null, 2)}
              </pre>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setStep("params")}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Create Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step: Creating */}
      {step === "creating" && (
        <div className="text-center py-12">
          <div className="text-white text-xl">Creating agent...</div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="text-center py-12">
          <div className="text-green-500 text-xl mb-4">Agent Created!</div>
          <p className="text-gray-400 mb-6">Job ID: {createdJobId}</p>
          <a
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </a>
        </div>
      )}
    </div>
  );
}
