"use client";

import { useState } from "react";
import { Job } from "@/lib/types";
import { hermes } from "@/lib/api";
import { RunProgress } from "./run-progress";

interface AgentCardProps {
  job: Job;
}

export function AgentCard({ job }: AgentCardProps) {
  const [showRunProgress, setShowRunProgress] = useState(false);
  const statusColors = {
    active: "bg-green-500",
    paused: "bg-yellow-500",
    error: "bg-red-500",
  };

  const handlePauseResume = async () => {
    try {
      if (job.status === "active") {
        await hermes.pauseJob(job.id);
      } else {
        await hermes.resumeJob(job.id);
      }
      window.location.reload();
    } catch (err) {
      console.error("Failed to toggle job status:", err);
    }
  };

  return (
    <>
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-white">{job.name}</h3>
          <span
            className={`w-2 h-2 rounded-full ${statusColors[job.status]}`}
          />
        </div>
        <p className="text-sm text-gray-400 mb-2">Template: {job.template_id}</p>
        <p className="text-sm text-gray-400">
          Next run: {new Date(job.next_run).toLocaleString()}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowRunProgress(true)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Run Now
          </button>
          <button
            onClick={handlePauseResume}
            className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            {job.status === "active" ? "Pause" : "Resume"}
          </button>
        </div>
      </div>
      {showRunProgress && (
        <RunProgress jobId={job.id} onClose={() => setShowRunProgress(false)} />
      )}
    </>
  );
}