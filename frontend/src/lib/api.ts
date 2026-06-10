import { Agent, Template, Execution } from '../lib/types'

/**
 * All API calls go through the Next.js server-side proxy (/api/explore/*)
 * instead of hitting localhost:8643 directly from the browser.
 * This makes the app work from any network (SSH tunnel, VPN, etc.).
 */
const API_BASE = '/api/explore'
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'agenthub-local'

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
}

// --- Exploration API (proxied via /api/explore) ---

export async function getSystemOverview() {
  const res = await fetch(`${API_BASE}/api/system/overview`, { headers })
  if (!res.ok) throw new Error('Failed to fetch system overview')
  return res.json()
}

export async function getTemplates(): Promise<Template[]> {
  const res = await fetch(`${API_BASE}/api/templates`, { headers })
  if (!res.ok) throw new Error('Failed to fetch templates')
  return res.json()
}

export async function getTemplate(id: string): Promise<Template> {
  const res = await fetch(`${API_BASE}/api/templates/${id}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch template')
  return res.json()
}

export async function previewTemplate(id: string, config: Record<string, any>): Promise<string> {
  const res = await fetch(`${API_BASE}/api/templates/${id}/preview`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ config }),
  })
  if (!res.ok) throw new Error('Failed to preview template')
  const data = await res.json()
  return data.prompt
}

export async function getProfiles() {
  const res = await fetch(`${API_BASE}/api/system/profiles`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profiles')
  return res.json()
}

export async function getProfileDetail(name: string) {
  const res = await fetch(`${API_BASE}/api/system/profiles/${name}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profile detail')
  return res.json()
}

export async function getProfileMemory(name: string) {
  const res = await fetch(`${API_BASE}/api/system/profiles/${name}/memory`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profile memory')
  return res.json()
}

export async function getProfileConfig(name: string) {
  const res = await fetch(`${API_BASE}/api/system/profiles/${name}/config`, { headers })
  if (!res.ok) throw new Error('Failed to fetch profile config')
  return res.json()
}

export async function getSystemHooks() {
  const res = await fetch(`${API_BASE}/api/system/hooks`, { headers })
  if (!res.ok) throw new Error('Failed to fetch hooks')
  return res.json()
}

export async function getSystemActivity() {
  const res = await fetch(`${API_BASE}/api/system/activity`, { headers })
  if (!res.ok) throw new Error('Failed to fetch activity')
  return res.json()
}

export async function getMcpServers() {
  const res = await fetch(`${API_BASE}/api/system/mcp-servers`, { headers })
  if (!res.ok) throw new Error('Failed to fetch MCP servers')
  return res.json()
}

export async function getCronOverview() {
  const res = await fetch(`${API_BASE}/api/system/cron-overview`, { headers })
  if (!res.ok) throw new Error('Failed to fetch cron overview')
  return res.json()
}

export async function getGlobalConfig() {
  const res = await fetch(`${API_BASE}/api/system/config`, { headers })
  if (!res.ok) throw new Error('Failed to fetch global config')
  return res.json()
}

export async function getSkills() {
  const res = await fetch(`${API_BASE}/v1/skills`, { headers })
  if (!res.ok) throw new Error('Failed to fetch skills')
  return res.json()
}

export async function getToolsets() {
  const res = await fetch(`${API_BASE}/v1/toolsets`, { headers })
  if (!res.ok) throw new Error('Failed to fetch toolsets')
  return res.json()
}

export async function searchSessions(query: string) {
  const res = await fetch(`${API_BASE}/api/system/sessions/search?q=${encodeURIComponent(query)}`, { headers })
  if (!res.ok) throw new Error('Failed to search sessions')
  return res.json()
}

// --- Jobs (proxied via /api/explore) ---

export async function getJobs(): Promise<Agent[]> {
  const res = await fetch(`${API_BASE}/api/jobs`, { headers })
  if (!res.ok) throw new Error('Failed to fetch jobs')
  return res.json()
}

export async function getJob(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch job')
  return res.json()
}

export async function createJob(data: any): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const errBody = await res.json()
      if (errBody.message) detail += ': ' + errBody.message
    } catch {
      try {
        const text = await res.text()
        if (text) detail += ': ' + text.slice(0, 200)
      } catch {}
    }
    const err = new Error(detail)
    ;(err as any).status = res.status
    throw err
  }
  return res.json()
}

export async function updateJob(id: string, data: any): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update job')
  return res.json()
}

export async function deleteJob(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
    method: 'DELETE',
    headers
  })
  if (!res.ok) throw new Error('Failed to delete job')
}

export async function pauseJob(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}/pause`, {
    method: 'POST',
    headers
  })
  if (!res.ok) throw new Error('Failed to pause job')
  return res.json()
}

export async function resumeJob(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}/resume`, {
    method: 'POST',
    headers
  })
  if (!res.ok) throw new Error('Failed to resume job')
  return res.json()
}

export async function triggerJob(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}/trigger`, {
    method: 'POST',
    headers
  })
  if (!res.ok) throw new Error('Failed to trigger job')
  return res.json()
}

export async function getJobOutputs(id: string): Promise<Execution[]> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}/outputs`, { headers })
  if (!res.ok) throw new Error('Failed to fetch job outputs')
  return res.json()
}

// Re-export API_BASE for components that need it (e.g. SSE)
export { API_BASE as EXPLORE_API }
