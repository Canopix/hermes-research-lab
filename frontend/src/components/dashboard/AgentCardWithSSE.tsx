"use client";

import { useEffect, useState, useCallback } from "react";
import { Agent } from "@/lib/types";
import { AgentCard } from "./AgentCard";
import { useSSE, SSEEvent } from "@/hooks/useSSE";
import { useExecutionPoll } from "@/hooks/useExecutionPoll";
import { EXPLORE_API } from "@/lib/api";
import { toast } from "sonner";

interface AgentCardWithSSEProps {
  agent: Agent;
  onAgentChange?: (agentId: string, patch: Partial<Agent>) => void;
  onDelete?: (agentId: string) => Promise<void>;
  index?: number;
}

function resolveStatusAfterRun(agent: Agent): Agent["status"] {
  const last = (agent.lastStatus ?? "").toLowerCase();
  if (last === "error" || last === "failed") return "error";
  return "active";
}

export function AgentCardWithSSE({ agent, onAgentChange, onDelete, index = 0 }: AgentCardWithSSEProps) {
  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [activeTool, setActiveTool] = useState<string | undefined>(undefined);

  const isRunning = agent.status === "running";
  const runId = isRunning ? agent.id : null;

  const handleEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case "lifecycle": {
        const { progress: p } = event.data || {};
        if (p !== undefined && p !== null) {
          setProgress(Number(p));
        }
        break;
      }
      case "tool_start": {
        const toolName = event.data?.tool || event.data?.name || event.data?.tool_name;
        if (toolName) setActiveTool(toolName);
        break;
      }
      case "tool_end": {
        setActiveTool(undefined);
        break;
      }
      case "token": {
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

  const handleExecutionComplete = useCallback(
    (updated: Agent) => {
      setProgress(undefined);
      setActiveTool(undefined);
      const nextStatus = resolveStatusAfterRun(updated);
      onAgentChange?.(agent.id, {
        ...updated,
        status: nextStatus,
      });
      toast.success(
        nextStatus === "error"
          ? `${agent.name} terminó con error`
          : `${agent.name} completó la ejecución`,
      );
    },
    [agent.id, agent.name, onAgentChange],
  );

  const handleExecutionTimeout = useCallback(() => {
    setProgress(undefined);
    setActiveTool(undefined);
    onAgentChange?.(agent.id, { status: "active" });
    toast.message(`${agent.name} sigue en cola — Hermes ejecutará en breve`);
  }, [agent.id, agent.name, onAgentChange]);

  useExecutionPoll({
    agent,
    enabled: isRunning,
    onComplete: handleExecutionComplete,
    onTimeout: handleExecutionTimeout,
  });

  useEffect(() => {
    if (error) {
      console.warn(`SSE error for agent ${agent.id}:`, error);
    }
  }, [error, agent.id]);

  const handleStatusChange = useCallback(
    (agentId: string, newStatus: string) => {
      onAgentChange?.(agentId, { status: newStatus as Agent["status"] });
    },
    [onAgentChange],
  );

  return (
    <AgentCard
      agent={agent}
      progress={progress}
      activeTool={activeTool}
      runId={runId}
      sseConnected={isConnected}
      onStatusChange={handleStatusChange}
      onDelete={onDelete}
      index={index}
    />
  );
}
