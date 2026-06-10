"use client";

import { useState, useEffect, useRef } from "react";
import { useSSE, SSEEvent } from "@/hooks/useSSE";
import { hermes } from "@/lib/api";

interface RunProgressProps {
  jobId: string;
  onClose: () => void;
}

export function RunProgress({ jobId, onClose }: RunProgressProps) {
  const [runId, setRunId] = useState<string | null>(null);
  const [creatingRun, setCreatingRun] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const runIdRef = useRef<string | null>(null);
  const sseUrl = runId ? hermes.streamRunUrl(runId) : null;
  const { events, connected, error: sseError } = useSSE(sseUrl);

  useEffect(() => {
    if (!runId && !creatingRun && !createError) {
      setCreatingRun(true);
      hermes
        .createRun({ job_id: jobId })
        .then((result) => {
          runIdRef.current = result.run_id;
          setRunId(result.run_id);
          setCreatingRun(false);
        })
        .catch((err) => {
          setCreateError(err.message);
          setCreatingRun(false);
        });
    }
  }, [jobId, runId, creatingRun, createError]);

  const latestEvent = events[events.length - 1];
  const isDone =
    latestEvent?.type === "done" || latestEvent?.type === "error";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Agent Execution
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {creatingRun && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-400">Starting execution...</p>
          </div>
        )}

        {createError && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-400">Failed to start: {createError}</p>
          </div>
        )}

        {events.length > 0 && (
          <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
            {events.map((event, i) => (
              <EventRow key={i} event={event} />
            ))}
          </div>
        )}

        {sseError && (
          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3 mb-4">
            <p className="text-yellow-400 text-sm">
              Connection issue: {sseError}
            </p>
          </div>
        )}

        {runId && !isDone && (
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? "bg-green-500 animate-pulse" : "bg-yellow-500"
              }`}
            />
            <span className="text-sm text-gray-400">
              {connected ? "Connected - running..." : "Reconnecting..."}
            </span>
          </div>
        )}

        {isDone && (
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mt-2"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: SSEEvent }) {
  const icon = {
    status: "●",
    output: "▶",
    error: "✕",
    done: "✓",
  }[event.type];

  const color = {
    status: "text-blue-400",
    output: "text-green-400",
    error: "text-red-400",
    done: "text-green-400",
  }[event.type];

  return (
    <div className="flex items-start gap-2 text-sm">
      <span className={`${color} mt-0.5`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-gray-300 break-words">
          {event.type === "output" ? (
            <code className="text-xs">{event.data}</code>
          ) : (
            event.data
          )}
        </p>
      </div>
    </div>
  );
}