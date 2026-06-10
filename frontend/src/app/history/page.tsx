"use client";

import { useState } from "react";
import { useJobs, useJobOutputs } from "@/hooks/useQueries";
import { Job, JobOutput } from "@/lib/types";

export default function HistoryPage() {
  const { data: jobs, loading: jobsLoading } = useJobs();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  if (jobsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Execution History</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job list */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-white mb-4">Agents</h2>
          <div className="space-y-2">
            {jobs?.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={`w-full text-left p-3 rounded-lg border ${
                  selectedJobId === job.id
                    ? "bg-gray-800 border-blue-600"
                    : "bg-gray-900 border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="font-medium text-white">{job.name}</div>
                <div className="text-sm text-gray-400">{job.template_id}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Outputs */}
        <div className="lg:col-span-2">
          {selectedJobId ? (
            <OutputsList jobId={selectedJobId} />
          ) : (
            <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
              <p className="text-gray-400">Select an agent to view its history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OutputsList({ jobId }: { jobId: string }) {
  const { data: outputs, loading, error } = useJobOutputs(jobId);

  if (loading) {
    return <div className="text-white">Loading outputs...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  if (!outputs || outputs.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
        <p className="text-gray-400">No outputs yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Outputs</h2>
      {outputs.map((output) => (
        <OutputCard key={output.id} output={output} />
      ))}
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
