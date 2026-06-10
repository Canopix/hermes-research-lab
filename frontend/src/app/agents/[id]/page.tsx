"use client";

import { use, useState } from "react";
import { useJobs, useJobOutputs } from "@/hooks/useQueries";
import { RunProgress } from "@/components/run-progress";
import { JobOutput } from "@/lib/types";

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: jobs, loading: jobsLoading } = useJobs();
  const { data: outputs, loading: outputsLoading } = useJobOutputs(id);
  const [showRun, setShowRun] = useState(false);

  const job = jobs?.find((j) => j.id === id);

  if (jobsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">Agent not found</p>
          <a href="/" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <a href="/" className="text-gray-400 hover:text-white text-sm mb-2 inline-block">
          ← Back to Dashboard
        </a>
        <h1 className="text-3xl font-bold text-white">{job.name}</h1>
        <p className="text-gray-400">Template: {job.template_id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  job.status === "active" ? "bg-green-500" :
                  job.status === "paused" ? "bg-yellow-500" : "bg-red-500"
                }`} />
                <span className="text-white">{job.status}</span>
              </div>
              <div>
                <p className="text-sm text-gray-400">Next Run</p>
                <p className="text-white">{new Date(job.next_run).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Last Run</p>
                <p className="text-white">{new Date(job.last_run).toLocaleString()}</p>
              </div>
            </div>
            <button
              onClick={() => setShowRun(true)}
              className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Run Now
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Execution History</h2>
          {outputsLoading ? (
            <div className="text-white">Loading outputs...</div>
          ) : !outputs || outputs.length === 0 ? (
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
              <p className="text-gray-400">No executions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {outputs.map((output) => (
                <OutputCard key={output.id} output={output} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showRun && <RunProgress jobId={job.id} onClose={() => setShowRun(false)} />}
    </div>
  );
}

function OutputCard({ output }: { output: JobOutput }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-1 text-xs rounded ${
                output.status === "success"
                  ? "bg-green-900/50 text-green-400"
                  : "bg-red-900/50 text-red-400"
              }`}
            >
              {output.status}
            </span>
            <span className="text-sm text-gray-400">
              {new Date(output.timestamp).toLocaleString()}
            </span>
          </div>
          <span className="text-sm text-gray-500">
            {(output.duration_ms / 1000).toFixed(1)}s
          </span>
        </div>
        {!expanded && (
          <p className="mt-2 text-sm text-gray-300 truncate">{output.output}</p>
        )}
      </div>
      {expanded && (
        <div className="border-t border-gray-800 p-4">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap">
            {output.output}
          </pre>
        </div>
      )}
    </div>
  );
}