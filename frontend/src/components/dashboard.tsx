"use client";

import { useJobs, useOverview } from "@/hooks/useQueries";
import { AgentCard } from "./agent-card";
import { StatsOverview } from "./stats-overview";

export function Dashboard() {
  const { data: jobs, loading: jobsLoading, error: jobsError } = useJobs();
  const { data: overview, loading: overviewLoading } = useOverview();

  if (jobsLoading || overviewLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (jobsError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-red-400">Error loading data: {jobsError}</p>
          <p className="text-gray-500 text-sm mt-2">
            Make sure the Hermes API and Exploration API are running.
          </p>
        </div>
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

      {overview && <StatsOverview overview={overview} />}

      <div className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-4">Your Agents</h2>
        {jobs && jobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <AgentCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-800 text-center">
            <p className="text-gray-400">No agents configured yet.</p>
            <a
              href="/create"
              className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create your first agent
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
