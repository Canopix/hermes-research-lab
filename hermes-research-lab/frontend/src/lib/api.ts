import {
  SystemOverview,
  Profile,
  Template,
  TemplatePreview,
  Job,
  JobOutput,
  Session,
  Hook,
  McpServer,
  ActivityEntry,
} from "./types";

const HERMES_URL =
  process.env.NEXT_PUBLIC_HERMES_URL || "http://localhost:8642";
const EXPLORE_URL =
  process.env.NEXT_PUBLIC_EXPLORE_URL || "http://localhost:8643";
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

function auth(): HeadersInit {
  return API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
}

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const searchParams = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch(`${url}${searchParams}`, {
    headers: auth(),
  });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
  return res.json();
}

async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth() },
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`);
  return res.json();
}

// Hermes API Server
export const hermes = {
  // Jobs
  getJobs: () => get<Job[]>(`${HERMES_URL}/api/jobs`),
  createJob: (data: { name: string; template_id: string; params: Record<string, string> }) =>
    post<Job>(`${HERMES_URL}/api/jobs`, data),
  pauseJob: (id: string) => post<void>(`${HERMES_URL}/api/jobs/${id}/pause`),
  resumeJob: (id: string) => post<void>(`${HERMES_URL}/api/jobs/${id}/resume`),
  triggerJob: (id: string) => post<void>(`${HERMES_URL}/api/jobs/${id}/run`),
  getJobOutputs: (id: string) => get<JobOutput[]>(`${HERMES_URL}/api/jobs/${id}/outputs`),

  // Sessions
  getSessions: () => get<Session[]>(`${HERMES_URL}/api/sessions`),

  // Discovery
  getSkills: () => get<unknown[]>(`${HERMES_URL}/v1/skills`),
  getToolsets: () => get<unknown[]>(`${HERMES_URL}/v1/toolsets`),
  getHealth: () => get<unknown>(`${HERMES_URL}/health/detailed`),

  // Runs (SSE)
  createRun: (data: { job_id: string }) =>
    post<{ run_id: string }>(`${HERMES_URL}/v1/runs`, data),
  streamRunUrl: (id: string) => `${HERMES_URL}/v1/runs/${id}/events`,
};

// Exploration API
export const explore = {
  getOverview: () => get<SystemOverview>(`${EXPLORE_URL}/api/system/overview`),
  getProfiles: () => get<Profile[]>(`${EXPLORE_URL}/api/system/profiles`),
  getProfile: (name: string) =>
    get<Profile>(`${EXPLORE_URL}/api/system/profiles/${name}`),
  getMemory: (name: string) =>
    get<{ name: string; memory: string }>(
      `${EXPLORE_URL}/api/system/profiles/${name}/memory`
    ),
  getTemplates: () => get<Template[]>(`${EXPLORE_URL}/api/templates`),
  getTemplate: (id: string) =>
    get<Template>(`${EXPLORE_URL}/api/templates/${id}`),
  getTemplatePreview: (id: string, params: Record<string, string>) =>
    get<TemplatePreview>(`${EXPLORE_URL}/api/templates/${id}/preview`, params),
  getHooks: () => get<Hook[]>(`${EXPLORE_URL}/api/system/hooks`),
  getMcpServers: () => get<McpServer[]>(`${EXPLORE_URL}/api/system/mcp-servers`),
  searchSessions: (q: string) =>
    get<Session[]>(`${EXPLORE_URL}/api/system/sessions/search`, { q }),
  getActivity: (limit = 50) =>
    get<ActivityEntry[]>(`${EXPLORE_URL}/api/system/activity`, {
      limit: String(limit),
    }),
};
