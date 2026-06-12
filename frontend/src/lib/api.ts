import { Agent, Template, Execution } from '../lib/types'

/**
 * All API calls go through the Next.js server-side proxy (/api/explore/*)
 * instead of hitting localhost:8643 directly from the browser.
 * This makes the app work from any network (SSH tunnel, VPN, etc.).
 */
const API_BASE = '/api/explore'
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'agenthub-local'

export const exploreApiHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
}

const headers = exploreApiHeaders

const FETCH_TIMEOUT_MS = 12_000

async function fetchApi(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
}

/** Lightweight health check for UI status indicators (no auth required). */
export async function checkExploreApiOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
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
  const data = await res.json()
  return Array.isArray(data) ? data : (data.results ?? [])
}

function formatAgentDate(value: unknown): string | null {
  if (!value || typeof value !== 'string') return null
  try {
    return new Date(value).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

function normalizeAgent(raw: Record<string, unknown>): Agent {
  const state = String(raw.state ?? raw.status ?? '')
  const enabled = raw.enabled !== false

  let status: Agent['status'] = 'active'
  if (raw.paused_at || state === 'paused' || !enabled) {
    status = 'paused'
  } else if (state === 'error' || state === 'failed' || raw.last_error) {
    status = 'error'
  }

  const schedule = raw.schedule as Record<string, unknown> | undefined
  const nextRunRaw =
    raw.next_run_at ?? raw.nextRun ?? schedule?.display ?? raw.schedule_display
  const lastRunRaw = raw.last_run_at ?? raw.lastRun ?? null

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? raw.id ?? 'Agent'),
    status,
    template: String(raw.template ?? raw.template_id ?? raw.skill ?? ''),
    profile: raw.profile != null ? String(raw.profile) : undefined,
    nextRun: formatAgentDate(nextRunRaw),
    lastRun: formatAgentDate(lastRunRaw),
    lastRunAt: lastRunRaw ? String(lastRunRaw) : null,
    lastStatus: raw.last_status != null ? String(raw.last_status) : null,
    config: (raw.config as Record<string, unknown>) ?? {},
  }
}

function normalizeAgentList(data: unknown): Agent[] {
  const items = Array.isArray(data) ? data : []
  return items.map((item) => normalizeAgent(item as Record<string, unknown>))
}

function normalizeExecution(raw: Record<string, unknown>, agentId?: string): Execution {
  const finished =
    raw.finishedAt ?? raw.finished_at ?? raw.ended_at ?? raw.completed_at ?? null

  return {
    id: String(raw.id ?? raw.session_id ?? ''),
    agentId: String(agentId ?? raw.agentId ?? raw.agent_id ?? raw.job_id ?? ''),
    status: String(raw.status ?? 'unknown'),
    startedAt: String(
      raw.startedAt ?? raw.started_at ?? raw.timestamp ?? new Date().toISOString()
    ),
    finishedAt: finished ? String(finished) : null,
    output: String(raw.output ?? raw.content ?? raw.result ?? raw.body ?? ''),
    duration:
      typeof raw.duration === 'number'
        ? raw.duration
        : typeof raw.duration_ms === 'number'
          ? raw.duration_ms
          : null,
    title: raw.title != null ? String(raw.title) : undefined,
    excerpt: raw.excerpt != null ? String(raw.excerpt) : undefined,
    jobName: raw.job_name != null ? String(raw.job_name) : undefined,
    linkCount: typeof raw.link_count === 'number' ? raw.link_count : undefined,
    isSilent: raw.is_silent === true,
    isFailed: raw.is_failed === true,
  }
}

export async function getAllExecutions(): Promise<Execution[]> {
  return getReports()
}

export async function getReports(): Promise<Execution[]> {
  const res = await fetchApi(`${API_BASE}/api/reports`, { headers })
  if (!res.ok) throw new Error('Failed to fetch reports')
  const data = await res.json()
  const items = Array.isArray(data) ? data : []
  return items.map((item: Record<string, unknown>) =>
    normalizeExecution(item, String(item.job_id ?? item.agentId ?? ''))
  )
}

// --- Jobs (proxied via /api/explore) ---

export async function getJobs(): Promise<Agent[]> {
  const res = await fetchApi(`${API_BASE}/api/jobs`, { headers })
  if (!res.ok) throw new Error('Failed to fetch jobs')
  return normalizeAgentList(await res.json())
}

export async function getJob(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}`, { headers })
  if (!res.ok) throw new Error('Failed to fetch job')
  return normalizeAgent(await res.json())
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
      if (errBody.detail) detail += ': ' + (typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail))
      else if (errBody.message) detail += ': ' + errBody.message
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
  return normalizeAgent(await res.json())
}

export async function updateJob(id: string, data: any): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Failed to update job')
  return normalizeAgent(await res.json())
}

export async function deleteProfile(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/system/profiles/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch {}
    throw new Error(detail)
  }
}

export async function deleteJob(id: string): Promise<{ profile?: string; profile_deleted?: boolean }> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
    method: 'DELETE',
    headers
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
    } catch {}
    throw new Error(detail)
  }
  return res.json()
}

export async function pauseJob(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}/pause`, {
    method: 'POST',
    headers
  })
  if (!res.ok) throw new Error('Failed to pause job')
  return normalizeAgent(await res.json())
}

export async function resumeJob(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}/resume`, {
    method: 'POST',
    headers
  })
  if (!res.ok) throw new Error('Failed to resume job')
  return normalizeAgent(await res.json())
}

export async function triggerJob(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}/trigger`, {
    method: 'POST',
    headers
  })
  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const errBody = await res.json()
      if (errBody.detail) {
        detail += ': ' + (typeof errBody.detail === 'string' ? errBody.detail : JSON.stringify(errBody.detail))
      } else if (errBody.message) {
        detail += ': ' + errBody.message
      }
    } catch {
      try {
        const text = await res.text()
        if (text) detail += ': ' + text.slice(0, 200)
      } catch {}
    }
    throw new Error(detail)
  }
  return normalizeAgent(await res.json())
}

export async function getJobOutputs(id: string): Promise<Execution[]> {
  const res = await fetchApi(`${API_BASE}/api/jobs/${id}/outputs`, { headers })
  if (!res.ok) throw new Error('Failed to fetch job outputs')
  const data = await res.json()
  const items = Array.isArray(data) ? data : (data.outputs ?? [])
  return items.map((item: Record<string, unknown>) => normalizeExecution(item, id))
}

// Re-export API_BASE for components that need it (e.g. SSE)
export { API_BASE as EXPLORE_API }
