"use client";

import { useEffect, useState, useCallback } from "react";
import { Agent } from "@/lib/types";
import { AgentCard } from "./AgentCard";
import { useSSE, SSEEvent } from "@/hooks/useSSE";
import { EXPLORE_API } from "@/lib/api";

interface AgentCardWithSSEProps {
  agent: Agent;
  onStatusChange?: (agentId: string, newStatus: string) => void;
  index?: number;
}

export function AgentCardWithSSE({ agent, onStatusChange, index = 0 }: AgentCardWithSSEProps) {
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);

  const isRunning = agent.status === 'active';

  // Use agent id as the runId for SSE (jobs endpoint uses the same id)
  const runId = isRunning ? agent.id : null;

  const handleEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case 'lifecycle': {
        const { status, progress: p } = event.data || {};
        if (p !== undefined && p !== null) {
          setProgress(Number(p));
        }
        if (status) {
          // Could update agent status here if needed
        }
        break;
      }
      case 'tool_start': {
        const toolName = event.data?.tool || event.data?.name || event.data?.tool_name;
        if (toolName) {
          setActiveTool(toolName);
        }
        break;
      }
      case 'tool_end': {
        setActiveTool(undefined);
        break;
      }
      case 'token': {
        if (event.data?.progress !== undefined) {
          setProgress(Number(event.data.progress));
        }
        break;
      }
    }
  }, []);

  const { isConnected, error } = useSSE(
    EXPLORE_API,
    runId,
    handleEvent,
    isRunning,
  );

  // Sync status changes from SSE lifecycle events
  useEffect(() => {
    if (error) {
      console.warn(`SSE error for agent ${agent.id}:`, error);
    }
  }, [error, agent.id]);

  return (
    <AgentCard
      agent={agent}
      progress={progress}
      activeTool={activeTool}
      runId={runId}
      onStatusChange={onStatusChange}
      index={index}
    />
  );
}
