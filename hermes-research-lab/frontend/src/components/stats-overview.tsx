import { SystemOverview } from "@/lib/types";

interface StatsOverviewProps {
  overview: SystemOverview;
}

export function StatsOverview({ overview }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <p className="text-sm text-gray-400">Hermes Version</p>
        <p className="text-2xl font-bold text-white">{overview.hermes_version}</p>
      </div>
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <p className="text-sm text-gray-400">Profiles</p>
        <p className="text-2xl font-bold text-blue-500">{overview.profiles.length}</p>
      </div>
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <p className="text-sm text-gray-400">Templates</p>
        <p className="text-2xl font-bold text-purple-500">{overview.templates_count}</p>
      </div>
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <p className="text-sm text-gray-400">Total Skills</p>
        <p className="text-2xl font-bold text-green-500">{overview.total_skills}</p>
      </div>
    </div>
  );
}
