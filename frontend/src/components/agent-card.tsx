interface AgentCardProps {
  agent: {
    id: string;
    name: string;
    status: "running" | "stopped" | "error";
    lastRun: string;
    template: string;
  };
}

export function AgentCard({ agent }: AgentCardProps) {
  const statusColors = {
    running: "bg-green-500",
    stopped: "bg-gray-500",
    error: "bg-red-500",
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-white">{agent.name}</h3>
        <span
          className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`}
        />
      </div>
      <p className="text-sm text-gray-400 mb-2">Template: {agent.template}</p>
      <p className="text-sm text-gray-400">
        Last run: {new Date(agent.lastRun).toLocaleString()}
      </p>
      <div className="mt-4 flex gap-2">
        <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
          Run
        </button>
        <button className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600">
          Configure
        </button>
      </div>
    </div>
  );
}
