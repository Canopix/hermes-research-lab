"use client";

import { useState, useEffect } from "react";
import { AgentCard } from "./agent-card";
import { StatsOverview } from "./stats-overview";

interface Agent {
  id: string;
  name: string;
  status: "running" | "stopped" | "error";
  lastRun: string;
  template: string;
}

export function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch agents from API
    setAgents([
      {
        id: "1",
        name: "AI Researcher",
        status: "running",
        lastRun: "2024-03-10T10:30:00Z",
        template: "ai-researcher",
      },
      {
        id: "2",
        name: "Repo Monitor",
        status: "stopped",
        lastRun: "2024-03-09T15:45:00Z",
        template: "repo-monitor",
      },
    ]);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">AgentHub</h1>
        <p className="text-gray-400">
          Create, configure, and monitor autonomous AI agents
        </p>
      </div>

      <StatsOverview agents={agents} />

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Your Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
