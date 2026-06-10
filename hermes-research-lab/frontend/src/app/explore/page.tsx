"use client";

import { useState } from "react";
import {
  useOverview,
  useProfiles,
  useTemplates,
  useHooks,
  useMcpServers,
  useActivity,
} from "@/hooks/useQueries";

type TabId = "overview" | "profiles" | "templates" | "hooks" | "mcp" | "activity";

const tabs: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "profiles", label: "Profiles" },
  { id: "templates", label: "Templates" },
  { id: "hooks", label: "Hooks" },
  { id: "mcp", label: "MCP Servers" },
  { id: "activity", label: "Activity" },
];

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Explore</h1>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "profiles" && <ProfilesTab />}
      {activeTab === "templates" && <TemplatesTab />}
      {activeTab === "hooks" && <HooksTab />}
      {activeTab === "mcp" && <McpTab />}
      {activeTab === "activity" && <ActivityTab />}
    </div>
  );
}

function OverviewTab() {
  const { data, loading, error } = useOverview();

  if (loading) return <div className="text-white">Loading...</div>;
  if (error)
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="System">
        <InfoRow label="Hermes Version" value={data.hermes_version} />
        <InfoRow label="Provider" value={data.provider} />
        <InfoRow label="Templates" value={String(data.templates_count)} />
        <InfoRow label="Total Skills" value={String(data.total_skills)} />
      </Card>
      <Card title="Profiles">
        {data.profiles.length === 0 ? (
          <p className="text-gray-400">No profiles found</p>
        ) : (
          <div className="space-y-2">
            {data.profiles.map((p) => (
              <div key={p.name} className="bg-gray-800 rounded p-2">
                <div className="font-medium text-white">{p.name}</div>
                <div className="text-sm text-gray-400">
                  {p.model} · {p.skills_count} skills
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ProfilesTab() {
  const { data, loading, error } = useProfiles();

  if (loading) return <div className="text-white">Loading...</div>;
  if (error)
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((profile) => (
        <div key={profile.name} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-lg font-medium text-white mb-2">{profile.name}</h3>
          <p className="text-sm text-gray-400 mb-2">Model: {profile.model}</p>
          <p className="text-sm text-gray-400">Skills: {profile.skills_count}</p>
        </div>
      ))}
    </div>
  );
}

function TemplatesTab() {
  const { data, loading, error } = useTemplates();

  if (loading) return <div className="text-white">Loading...</div>;
  if (error)
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((template) => (
        <div key={template.id} className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <h3 className="text-lg font-medium text-white mb-2">{template.name}</h3>
          <p className="text-sm text-gray-400 mb-2">{template.description}</p>
          <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded">
            {template.category}
          </span>
        </div>
      ))}
    </div>
  );
}

function HooksTab() {
  const { data, loading, error } = useHooks();

  if (loading) return <div className="text-white">Loading...</div>;
  if (error)
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  if (!data) return null;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      {data.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No hooks configured</div>
      ) : (
        <div className="divide-y divide-gray-800">
          {data.map((hook) => (
            <div key={hook.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{hook.name}</div>
                  <div className="text-sm text-gray-400">{hook.type}</div>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    hook.enabled
                      ? "bg-green-900/50 text-green-400"
                      : "bg-gray-800 text-gray-500"
                  }`}
                >
                  {hook.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function McpTab() {
  const { data, loading, error } = useMcpServers();

  if (loading) return <div className="text-white">Loading...</div>;
  if (error)
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  if (!data) return null;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      {data.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No MCP servers configured</div>
      ) : (
        <div className="divide-y divide-gray-800">
          {data.map((server) => (
            <div key={server.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium text-white">{server.name}</div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    server.status === "connected"
                      ? "bg-green-900/50 text-green-400"
                      : "bg-red-900/50 text-red-400"
                  }`}
                >
                  {server.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityTab() {
  const { data, loading, error } = useActivity();

  if (loading) return <div className="text-white">Loading...</div>;
  if (error)
    return (
      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  if (!data) return null;

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800">
      {data.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No activity yet</div>
      ) : (
        <div className="divide-y divide-gray-800">
          {data.map((entry, i) => (
            <div key={i} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">{entry.event}</span>
                <span className="text-sm text-gray-500">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-400">{entry.details}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable components
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
