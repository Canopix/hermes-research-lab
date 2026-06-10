interface StatsOverviewProps {
  agents: {
    id: string;
    status: "running" | "stopped" | "error";
  }[];
}

export function StatsOverview({ agents }: StatsOverviewProps) {
  const running = agents.filter((a) => a.status === "running").length;
  const stopped = agents.filter((a) => a.status === "stopped").length;
  const errors = agents.filter((a) => a.status === "error").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <p className="text-sm text-gray-400">Running</p>
        <p className="text-2xl font-bold text-green-500">{running}</p>
      </div>
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <p className="text-sm text-gray-400">Stopped</p>
        <p className="text-2xl font-bold text-gray-500">{stopped}</p>
      </div>
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <p className="text-sm text-gray-400">Errors</p>
        <p className="text-2xl font-bold text-red-500">{errors}</p>
      </div>
    </div>
  );
}
