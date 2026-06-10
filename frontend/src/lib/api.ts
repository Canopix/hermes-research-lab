import { Agent, Template, Execution } from '../lib/types'

export const HERMES_API = process.env.NEXT_PUBLIC_HERMES_API || 'http://localhost:8642'
const EXPLORE_API = process.env.NEXT_PUBLIC_EXPLORE_API || 'http://localhost:8643'
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'agenthub-local'

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
}

// --- Exploration API (:8643) ---

export async function getSystemOverview() {
  const res = await fetch(`${EXPLORE_API}/api/system/overview`, { headers })
  if (!res.ok) throw new Error('Failed to fetch system overview')
  return res.json()
}

export async function getTemplates(): Promise<Template[]> {
  const res = await fetch(`${EXPLORE_API}/api/templates`, { headers })
  if (!res.ok) throw new Error('Failed to fetch templates')
  return res.json()
}

export async function getTemplate(id: string): Promise<Template> {
  const res = await fetch(`${EXPLORE_API}/api/templates/${id}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch template')
  return res.json()
}

export async function previewTemplate(id: string, config: Record<string, any>): Promise<string> {
  const res = await fetch(`${EXPLORE_API}/api/templates/${id}/preview`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ config }),
  })
  if (!res.ok) throw new Error('Failed to preview template')
  const data = await res.json()
  return data.prompt
}

export async function getProfiles() {
  const res = await fetch(`${EXPLORE_API}/api/system/profiles`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profiles')
  return res.json()
}

export async function getProfileDetail(name: string) {
  const res = await fetch(`${EXPLORE_API}/api/system/profiles/${name}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profile detail')
  return res.json()
}

export async function getProfileMemory(name: string) {
  const res = await fetch(`${EXPLORE_API}/api/system/profiles/${name}/memory`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profile memory')
  return res.json()
}

export async function getProfileConfig(name: string) {
  const res = await fetch(`${EXPLORE_API}/api/system/profiles/${name}/config`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profile config')
  return res.json()
}

export async function getSystemHooks() {
  const res = await fetch(`${EXPLORE_API}/api/system/hooks`, { headers })
  if (!res.ok) throw new Error('Failed to fetch hooks')
  return res.json()
}

export async function getSystemActivity() {
  const res = await fetch(`${EXPLORE_API}/api/system/activity`, { headers })
  if (!res.ok) throw new Error('Failed to fetch activity')
  return res.json()
}

export async function getMcpServers() {
  const res = await fetch(`${EXPLORE_API}/api/system/mcp-servers`, { headers })
  if (!res.ok) throw new Error('Failed to fetch MCP servers')
  return res.json()
}

export async function getCronOverview() {
  const res = await fetch(`${EXPLORE_API}/api/system/cron-overview`, { headers })
  if (!res.ok) throw new Error('Failed to fetch cron overview')
  return res.json()
}

export async function getGlobalConfig() {
  const res = await fetch(`${EXPLORE_API}/api/system/config`, { headers })
  if (!res.ok) throw new Error('Failed to fetch global config')
  return res.json()
}

export async function getSkills() {
  const res = await fetch(`${EXPLORE_API}/v1/skills`, { headers })
  if (!res.ok) throw new Error('Failed to fetch skills')
  return res.json()
}

export async function getToolsets() {
  const res = await fetch(`${EXPLORE_API}/v1/toolsets`, { headers })
  if (!res.ok) throw new Error('Failed to fetch toolsets')
  return res.json()
}

export async function searchSessions(query: string) {
  const res = await fetch(`${EXPLORE_API}/api/system/sessions/search?q=${encodeURIComponent(query)}`, { headers })
  if (!res.ok) throw new Error('Failed to search sessions')
  return res.json()
}

// --- API Server de Hermes (:8642) ---

export async function getJobs(): Promise<Agent[]> {
  const res = await fetch(`${HERMES_API}/jobs`, { headers })
  if (!res.ok) throw new Error('Failed to fetch jobs')
  return res.json()
}

export async function getJob(id: string): Promise<Agent> {
  const res = await fetch(`${HERMES_API}/jobs/${id}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch job')
  return res.json()
}

export async function createJob(data: any): Promise<Agent> {
  const res = await fetch(`${HERMES_API}/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to create job')
  return res.json()
}

export async function updateJob(id: string, data: any): Promise<Agent> {
  const res = await fetch(`${HERMES_API}/jobs/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update job')
  return res.json()
}

export async function deleteJob(id: string): Promise<void> {
  const res = await fetch(`${HERMES_API}/jobs/${id}`, {
    method: 'DELETE',
    headers
  })
  if (!res.ok) throw new Error('Failed to delete job')
}

export async function pauseJob(id: string): Promise<Agent> {
  const res = await fetch(`${HERMES_API}/jobs/${id}/pause`, {
    method: 'POST',
    headers
  })
  if (!res.ok) throw new Error('Failed to pause job')
  return res.json()
}

export async function resumeJob(id: string): Promise<Agent> {
  const res = await fetch(`${HERMES_API}/jobs/${id}/resume`, {
    method: 'POST',
    headers
  })
  if (!res.ok) throw new Error('Failed to resume job')
  return res.json()
}

export async function triggerJob(id: string): Promise<Agent> {
  const res = await fetch(`${HERMES_API}/jobs/${id}/trigger`, {
    method: 'POST',
    headers
  })
  if (!res.ok) throw new Error('Failed to trigger job')
  return res.json()
}

export async function getJobOutputs(id: string): Promise<Execution[]> {
  const res = await fetch(`${HERMES_API}/jobs/${id}/outputs`, { headers })
  if (!res.ok) throw new Error('Failed to fetch job outputs')
  return res.json()
}
